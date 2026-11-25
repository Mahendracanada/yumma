const fs = require('node:fs');
const path = require('node:path');
const { MemoryStore } = require('./memory');
const { buildWisdomGraph } = require('./wisdom-graph');
const { evaluateLifeRipple } = require('./life-ripple');
const { buildProtectionPlan } = require('./protection-orchestrator');
const { familyCheckApplies } = require('./family-check');
const memoryStore = new MemoryStore();

const DATA = path.join(__dirname, '..', 'data', 'salma-profile.json');
const ALLOWED_TOOLS = Object.freeze({
  create_verification_checklist: {
    description: 'Prepare a local checklist for independently verifying a request.',
    input: ['channel'],
    effect: 'local_only'
  },
  record_user_decision: {
    description: 'Record the user’s chosen next step in the local synthetic demo.',
    input: ['decision'],
    effect: 'local_only'
  }
});

function loadProfile() {
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}

const ARABIC_SAFETY_TERMS = [
  // Longer phrases first. Arabic has no \b word boundary, so terms are mapped to
  // spaced English tokens that the English cue rules below can recognise.
  [/تحويل(?:\s+الأموال|\s+المال)?|أرسل\s+المال|حوّل\s+المال/g, ' transfer money '],
  // Gulf dialect: "transfer them to this account", "send it to me", "phone broke", "don't call", "urgent now".
  [/حو[ّ]?ل(?:ي|يهم|يها|يه|وا|هم|ها)?\s+(?:على|لي|ل)|ارسل(?:ي|يهم|يها)?\s+(?:لي|على)|ابعث(?:ي|يهم|يها)?\s+(?:لي|على)/g, ' transfer money to '],
  [/(?:على|في)\s+(?:هذا|هالـ?)\s*الحساب|رقم\s+الحساب|الآيبان|ايبان/g, ' bank account '],
  [/(?:تلفوني|جوالي|موبايلي|هاتفي)\s+(?:خرب|انكسر|ضاع|طاح|تعطل)|(?:ضاع|خرب|انكسر)\s+(?:تلفوني|جوالي|موبايلي|هاتفي)/g, ' my phone broke '],
  [/(?:و)?لا\s+(?:تتصل(?:ي|ين|ون|وا)?|تكلم(?:ي|ين)?ني|تدق(?:ي|ين)?)/g, ' do not call me '],
  [/محتاج(?:ة|ين)?/g, ' need money '],
  [/ضروري|عاجل|بسرعة|فوراً|فورا|الحين|حالاً|حالا/g, ' urgent now '],
  [/حساب\s+آمن|حساب\s+مؤمن/g, ' safe account '],
  [/رقم\s+البطاقة|بيانات\s+البطاقة|رمز\s+cvv/g, ' card number '],
  [/رمز\s+التحقق|رمز\s+الأمان|كلمة\s+المرور|رقم\s+سري|رمز\s+لمرة\s+واحدة/g, ' otp security code password '],
  [/سيتم\s+حظر|سيتم\s+إيقاف|حسابك\s+محظور|إيقاف\s+الحساب|تم\s+إيقاف|تم\s+حظر/g, ' account blocked '],
  [/مشاركة\s+الشاشة|تحكم\s+عن\s+بعد|الوصول\s+عن\s+بعد/g, ' remote access screen sharing '],
  [/لا\s+تخبر|لا\s+تخبروا|لا\s+تخبر\s+أحداً|أبقِ\s+الأمر\s+سراً|سري/g, ' do not tell anyone '],
  [/أرباح\s+مضمونة|ربح\s+مضمون|عائد\s+مضمون/g, ' guaranteed profit '],
  [/جائزة|ربحت|فزت|مبروك/g, ' congratulations you won a prize '],
  [/رسوم/g, ' fee '],
  [/عميلنا\s+العزيز|عزيزي\s+العميل|عميلنا\s+الكريم/g, ' dear customer '],
  [/خلال\s+(?:ساعة|ساعتين|يوم|\d+\s*ساعات?|\d+\s*ساعة)/g, ' within 1 hours '],
  [/تحديث\s+(?:بياناتك|البيانات|معلوماتك)/g, ' update your details '],
  [/بطاقتك/g, ' your card '],
  [/هيئة\s+الطرق(?:\s+والمواصلات)?/g, ' rta '],
  [/مخالفة\s+غير\s+مدفوعة|مخالفة\s+مرورية|مخالفة/g, ' unpaid fine on your vehicle '],
  [/ادفعها|ادفع|سددها|سدد|الدفع|دفع/g, ' pay '],
  [/الغرامة|غرامة/g, ' a fine '],
  [/رقمي\s+الجديد/g, ' new number '],
  [/في\s+ورطة|ورطة/g, ' in trouble '],
  [/دراهم|درهم/g, ' aed '],
  [/احتاج|أحتاج/g, ' need money '],
  [/ماما|بابا|يمه|يبه/g, ' mum '],
  [/اضغط|الرابط|رابط/g, ' click the link '],
  [/رقم\s+جديد/g, ' new number '],
  [/ابني|ابنتي|أمي|أبي|أخي|أختي|حفيدي|حفيدتي/g, ' son '],
  [/الشرطة|شرطة/g, ' police '],
  [/أموالي|مدخراتي/g, ' my money '],
  [/استثمار|استثمر/g, ' invest '],
  [/يدعي|يقول|يطلب|متصل|يتصل|رسالة|شخص/g, ' caller says asks '],
  [/بنك|المصرف/g, ' bank '],
  [/فوراً|فورا|حالاً|حالا|عاجل|بسرعة|الآن/g, ' urgent now ']
];
// Obfuscation defences (red-team findings, v2.8): scammers hide keywords with invisible
// characters, look-alike letters, spaced or dotted letters, digits for letters, full-width
// forms and Arabic vowel marks. Everything is folded to one plain form before matching.
const INVISIBLE_CHARS = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;
const HOMOGLYPHS = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ӏ': 'l', 'к': 'k', 'м': 'm', 'т': 't', 'в': 'b', 'н': 'h', 'ο': 'o', 'α': 'a', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x' };
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const foldArabic = s => s.replace(ARABIC_MARKS, '').replace(/[أإآٱ]/g, 'ا');
const ARABIC_TERMS_FOLDED = ARABIC_SAFETY_TERMS.map(([pattern, replacement]) => [new RegExp(foldArabic(pattern.source), pattern.flags), replacement]);
const LEET = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
function unLeet(token) {
  const letters = (token.match(/[a-z]/g) || []).length, digits = (token.match(/[0-9@$]/g) || []).length;
  if (letters < 2 || digits < 1 || digits > 2 || digits >= letters) return token;
  return token.replace(/[013457@$]/g, ch => LEET[ch]);
}
function normalizeSafetyText(message) {
  let normalized = String(message || '').normalize('NFKC').replace(INVISIBLE_CHARS, '').toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x6F0));
  normalized = normalized.replace(/[а-яёіјѕԁӏα-ω]/g, ch => HOMOGLYPHS[ch] || ch);
  normalized = normalized.replace(/\b[a-z](?:[\s.\-_*•·]+[a-z]\b){2,}/g, m => m.replace(/[^a-z]/g, ''));
  normalized = normalized.replace(/[a-z0-9@$]+/g, unLeet);
  normalized = foldArabic(normalized);
  for (const [pattern, replacement] of ARABIC_TERMS_FOLDED) normalized = normalized.replace(pattern, replacement);
  return normalized;
}
function detectLanguage(message) {
  return /[؀-ۿ]/.test(String(message || '')) ? 'ar' : 'en';
}

// Cue lexicon. Each cue is a recognisable scam ingredient documented in UAE and
// international scam typologies (impersonation, advance fee, safe-account,
// investment, romance, family-emergency, delivery/utility phishing, device takeover).
const FAMILY = '(?:son|daughter|mum|mom|mother|dad|father|grandson|granddaughter|grandma|grandmother|grandpa|grandfather|cousin|sister|brother|nephew|niece|uncle|aunt|husband|wife|child|kid)';
const CUE_PATTERNS = Object.freeze({
  urgency: /\b(immediately|urgent(?:ly)?|right now|now|asap|quickly|hurry|today|tonight|within \d+ (?:minutes?|hours?)|in \d+ (?:minutes?|hours?)|act now|last chance|expires?|expiring|fast|hurry up|before (?:they|it|midnight|tomorrow))\b/,
  transfer: /\b(transfer|send (?:\w+ ){0,3}?(?:money|aed|dirhams?|funds|cash|payment)|send aed|wire|western union|moneygram|bank account|beneficiary|gift ?cards?|itunes cards?|google play cards?|apple (?:gift )?cards?|crypto(?:currency)?|bitcoin|usdt|move (?:my |the |your |all )?(?:money|savings|funds)|deposit|pay(?:ing|ment)?|paid|fee|(?:unpaid|traffic|a) fine|invest(?:ment|ing)?|borrow|lend (?:me|us)|loan me|send (?:me |you |him |her )?\d{3,}[\d,]*|buy (?:\d+ )?(?:\w+ )?(?:\w+ )?cards|(?:needs?|wants?|asking for|asks? for|asked for|requesting|request) (?:\w+ ){0,2}?(?:money|cash|funds|a loan|aed|dirhams))\b|\baed ?\d|\d[\d,.]* ?(?:aed|dirhams?)\b/,
  secrecy: /\b(don'?t (?:call|tell|inform) (?:mum|mom|dad|my (?:wife|husband|family)|anyone)|keep (?:this|it) (?:secret|quiet)|do not tell|don't tell|not to tell|confidential|tell nobody|between us|keep it quiet|(?:don'?t|do not) (?:tell|inform|mention (?:it |this )?to) (?:auntie|aunty|uncle|anyone|anybody|mum|mom|dad|your \w+|my \w+)|(?:don'?t|do not) mention (?:it|this)|(?:don'?t|do not) call (?:me|back|anyone)?|i can'?t talk|can'?t take calls)\b/,
  credential: /\b(password|otp|one.time (?:password|code)|pin|verification code|security code|passcode|login code|authentication code|cvv|card number|card details|\d[- ]?digit code|the code (?:they|we|i|you)|read out the code|code from my whatsapp|code (?:they|i) (?:just )?(?:sent|got|received)|share (?:the|your|that) code|code (?:we|i) (?:just )?sent|enter (?:your )?card(?: details| number)?|(?:with|using) your (?:card|card details|credit card|debit card))\b/,
  threat: /\b(blocked|block(?:ed)? your|suspended|closed|disconnected|cut off|will be cut|arrest(?:ed)?|deport(?:ed|ation)?|legal action|penalty|(?:unpaid|traffic|a) fine|frozen|money laundering|criminals?|linked to (?:a )?crime|on hold)\b/,
  impersonation: /\b(bank|police|ministry|government|tax authority|support team|customer support|support agent|fraud team|customs|courier|emirates post|aramex|dhl|dewa|addc|sewa|etisalat|e&|\bdu\b|icp|gdrfa|ceo|recovery agency|officer|investment manager|emirates nbd|enbd|adcb|fab|first abu dhabi|mashreq|dib|dubai islamic|adib|rakbank|emirates islamic|hsbc|citibank|nbf|wio|central bank|cbuae|rta|salik|amazon|noon|apple support|microsoft|your manager|my manager|your boss|hr department|director)\b/,
  remoteAccess: /\b(remote access|screen ?sharing|share (?:your|my) screen|anydesk|teamviewer|quicksupport|rustdesk|remote support|install (?:an |a |this |the )?app (?:on|to fix|to protect)|install (?:the |our |a |an )?(?:support|remote|help|helpdesk|security|refund) app)\b/,
  linkPressure: /\b(click(?:ing)? (?:on )?(?:this |the |a )?link|(?:via|at|on|through|using) (?:this |the )?link|install (?:this|the) app|download (?:this|the) app|scan (?:this|the) qr|reply with)\b|https?:\/\/|bit\.ly|\b[a-z0-9-]+\.(?:info|xyz|top|site|online|live|click)\b|\b[a-z0-9]+(?:-[a-z0-9]+)+\.(?:com|net|org|ae|co|biz|me|app|io)\b|\b(?:update|verify|confirm) (?:your )?(?:details|account|card|information|info) (?:at|on|via|here)\b|\b(?:click|tap) here\b/,
  tooGoodToBeTrue: /\b(congratulations|you(?:'ve| have)? won|your number won|winner|prize|raffle|lottery|jackpot|guaranteed (?:profit|returns?|income)|guarantees? \d+ ?%|\d+ ?% (?:daily|weekly|monthly|a day|a week|a month|per day|per month|returns?|profit)|double your money|risk.?free (?:profit|returns?)|earn aed ?\d[\d,]* (?:a|per) day|package (?:with|of|containing) gold|inheritance|unclaimed (?:funds|money)|work from home.{0,40}\bearn|liking (?:youtube )?videos|congrats|lucky (?:customer|winner|draw)|you(?:'ve| have)? been selected (?:for|to)|earn (?:aed ?)?\d[\d,]* (?:a |per )?(?:day|week|weekly|daily)|rating (?:hotels|products|apps)|beneficiary of (?:usd|aed|\$)? ?[\d.,]+ ?(?:million|m)|estate of (?:a |the |my )?late|doubles?(?: in| your)|double in|withdraw (?:twice|double)|hiring .{0,40}(?:aed ?)?\d[\d,]* (?:a|per) (?:day|week|month))\b/,
  upfrontFee: /\bpay (?:only |just )?(?:aed ?\d[\d,.]* |\d[\d,.]* ?aed )(?:for )?(?:the )?(?:delivery|redelivery|shipping|customs|release|processing|registration|handling)\b|\b(?:redelivery|shipping|customs|delivery) (?:charge|charges|duty)\b|\b(?:training|security|refundable|activation|registration) deposit\b|\b(?:legal|transfer|clearance|administration|release) fees?\b|\b(?:onboarding|starter|welcome) (?:kit|pack|fee)\b|\bpay (?:the |a |an |only )?(?:small )?(?:shipping|delivery|courier|customs|clearance|release|handling|processing|registration|activation|insurance|admin(?:istration)?|unlock(?:ing)?)\b|\b(?:registration|joining|starter kit) (?:fee|amount)\b|\b(?:delivery|release|registration|processing|customs|clearance|unlock|activation|reactivation|recovery|handling|admin(?:istration)?) fee\b|\bfee (?:to|for) (?:claim|release|receive|unlock)\b|\bpay .{0,40}\b(?:first|to claim|to receive|to release|to unlock)\b|\bfirst .{0,20}\bpay\b|\bpay .{0,40}\b(?:processing|before (?:they|we|it) (?:release|send|deliver))/,
  safeAccount: /\b(safe account|secure account|secure government account|safety account|protected account|move (?:my |your |the |all )?(?:money|savings|funds) to (?:a |an |the )?(?:new|safe|secure|protected|government))\b/,
  personalAccount: /\b(?:to |into )?(?:my|his|her|the agent'?s|the owner'?s) (?:personal|private|own) (?:bank )?account\b/,
  injection: /\b(ignore (?:all |your |the )?(?:previous |prior |above )?(?:instructions|rules|boundar(?:y|ies)|safety)|disregard (?:your|the|all)|tell (?:her|him|me|them) (?:it is|it's) safe)\b/,
  familyEmergency: new RegExp(`\\b(?:hi|hello|dear)? ?${FAMILY}\\b.{0,80}\\b(?:trouble|stuck|stranded|hospital|accident|emergency|stolen|arrested|jail|police station|dropped my phone|broke my phone|phone (?:broke|is broken|was stolen|died)|using a friend|lost my (?:phone|wallet)|new number)\\b|\\b(?:trouble|stuck|stranded|hospital|accident|emergency|stolen|arrested|new number).{0,80}\\b${FAMILY}\\b`),
  newContact: /\b(new number|new phone|new whatsapp|new sim|using (?:my )?(?:\w+'?s|a friend'?s|someone'?s) phone|different number|(?:a |my )?friend'?s (?:number|phone)|unknown number|never met|met online|online (?:girlfriend|boyfriend|friend|partner)|stranger|from a number that looks like|looks like my bank|messaged (?:me )?on (?:facebook|instagram|telegram|whatsapp|tiktok|snapchat)|on (?:telegram|instagram|tiktok)\b|dating (?:app|site))\b/,
  romance: /\b(never met|met online|online (?:girlfriend|boyfriend|partner)|dating (?:app|site)|so we can be together|come and see me|to visit me|(?:so i can|to) (?:finally )?come to you)\b|\b(?:miss you|my love|habibi|habibti|darling|sweetheart)\b.{0,120}\b(?:visa|stuck|ticket|flight|come to you|customs|hospital)\b/,
  payeeChange: /\b(new bank details|new iban|new account number|new beneficiary|different account|another account|change (?:the |their |our )?(?:supplier'?s? )?(?:bank )?(?:account|details)|update (?:the |their |our )?bank details|new account details)\b/,
  identityRequest: /\b((?:copy|photo|picture|scan) of (?:my |your )?(?:passport|emirates id|id card)|date of birth|emirates id(?: number)?|passport (?:number|copy)|account number|iban|mother'?s maiden name|full name and address|(?:confirm|update|verify|re-?confirm|provide) (?:your )?(?:bank|account|salary account|card|iban) details)\b/,
  receiveLink: /\b(send (?:me |you )?a (?:payment )?link|payment link|link (?:so i can|to) receive)\b/
});
const THIRD_PARTY = /\b(caller|called(?: me)?|calling|call from|someone|somebody|a man|a woman|a person|stranger|agent|officer|says|said|saying|asks|asked|asking|wants|wanted|told me|claims?|claiming|demands?|insists|offers|messaged|texted|emailed|e-?mail from|message|sms|text:|on the phone|on whatsapp|whatsapp:|on telegram|on instagram|on facebook|dm)\b/;
const INCOMING = /^(?:text|sms|message|email|whatsapp|dm)\s*:|^[a-z][\w .&'-]{1,30}:\s|\byour (?:[a-z0-9&]+ ){0,2}(?:account|card|parcel|package|shipment|number|line|bill|electricity|water|visa|id|emirates id|wallet|subscription|order|delivery|bank|phone|vehicle|car|salary|otp|payment|refund|loan)\b|\bcongratulations\b|^dear (?:customer|client|user|member|valued|sir|madam|friend)\b|^(?:hi|hello|hey|dear|salam|assalam[a-z ]*)\b[^.!?\n]{0,40}\b(?:it'?s|this is|i am|i'?m)\b|^(?:it'?s|this is) (?:me\b|your |[a-z]+ (?:from|here)\b)|\bwe (?:have )?(?:noticed|detected|are writing|are contacting)\b|^(?:our|the) (?:company|bank|team|school|landlord|hr)\b|^(?:[a-z]{1,10}[ ,]+)?(?:it'?s|this is) (?:me|your|[a-z]+)\b|^(?:hi|hello|hey|dear)\b[^.!?\n]{0,30}\b(?:can you|could you|please|pls)\b/;
// Informational notices (a credit, a receipt, a bill shown in its official app, a code with a
// "do not share" warning) are not requests. With no request for money and no HIGH pattern,
// they are dampened rather than flagged (v2.8 generalisation round, 24 Nov 2026).
const NOTICE = /\b(?:has|have) been (?:credited|debited|deducted|received|paid|processed|charged)\b|\b(?:credited|debited|deducted) (?:to|from)\b|\b(?:do not|don'?t|never) share (?:it|this|the code|this code|your otp|the otp)\b|\bif (?:you did not|you didn'?t|this wasn'?t you)\b|\breceipt\b|\bview (?:it|your bill|the bill|details|your statement) (?:in|on)\b|\bi (?:paid|sent|transferred)\b[^?]*\b(?:today|yesterday|already|this morning)\b|\b(?:was|were|has been) (?:spent|charged|used|recharged|topped up|renewed)\b|^i (?:just |already )?(?:paid|sent|transferred)\b|\bnot you\?|\bcall the number on (?:the back of )?your card\b|\bsuccessfully\b|\bout for delivery\b|\b(?:has been|was) (?:dispatched|shipped|delivered)\b|\bwill (?:call|contact you) when (?:nearby|close|arriving)\b/;
const OFFICIAL_APP = /\b(?:through|via|in|on|using|from) (?:the |your )?(?:[a-z0-9&]+ ){0,2}(?:app|portal|website|branch)\b/;
// A code delivered by the service itself, with its own "do not share" warning and no one asking for it.
const CODE_DELIVERY = /\b(?:otp|code|password|pin)\b[^.]{0,40}\bis:?\s*\d{4,8}\b/;
const DONT_SHARE = /\b(?:do not|don'?t|never) share\b|\bwill never ask (?:you )?for\b|\bnever (?:ask|request)s? (?:for )?your\b/;
const ASK_FOR_CODE = /\b(?:read|tell|give|forward|send) (?:me|us|it|the code|this code|the otp)\b|\bshare (?:it|the code|this code|the otp) with (?:me|us|our|the agent|the officer|him|her)\b/;
const HYPOTHETICAL = /\bif (?:someone|somebody|a caller|anyone|they|a person|a stranger)\b/;
const MONEY_ASK = /\b(?:can you|could you|would you|will you|please|pls|kindly|need you to|you (?:need|have|must) to)\b[^.?!]{0,40}\b(?:send|transfer|pay|lend|buy|deposit|wire|share|give)\b|\b(?:send|transfer|wire|lend|give) (?:me|us)\b/;
const SELF_INITIATED = /^(?:i|i'm|i am|i've|i have|i want|i need|i'd like|i paid|i'm paying|i'm sending|i will|we|we're|my salary|remind me|help me|how do i|how can i|how much|what|what's|which|why|when|where|is it|should i|can you|could you|please explain|explain)\b/;
const EDUCATIONAL = /^(?:what|what's|which|why|how do i|how can i|how does|how much|is it|should i|can you explain|could you explain|please explain|explain|tell me about)\b/;
const SELF_REQUESTED_CODE = /\b(i requested|i asked for|i (?:just )?logged in|to log in (?:to (?:the|my) app )?myself|myself)\b/;
const OFFICIAL_CHANNEL = /\b(official (?:app|portal|website|site|channel|branch)|play store|app store|like every month|every month|as usual|for her birthday|for his birthday|pay (?:my |him |her )?(?:friend )?back|she'?s expecting it|he'?s expecting it)\b/;

function extractRequest(message) {
  const text = String(message || '').trim();
  const lower = normalizeSafetyText(text);
  const cues = {};
  for (const [name, pattern] of Object.entries(CUE_PATTERNS)) cues[name] = pattern.test(lower);
  const thirdParty = THIRD_PARTY.test(lower) || INCOMING.test(lower);
  const codeDelivery = CODE_DELIVERY.test(lower) && DONT_SHARE.test(lower) && !ASK_FOR_CODE.test(lower);
  const context = {
    thirdParty,
    selfInitiated: !thirdParty && SELF_INITIATED.test(lower),
    educational: EDUCATIONAL.test(lower) && !cues.urgency,
    selfRequestedCode: SELF_REQUESTED_CODE.test(lower) || codeDelivery,
    officialOrRoutine: OFFICIAL_CHANNEL.test(lower),
    notice: NOTICE.test(lower) || codeDelivery || (OFFICIAL_APP.test(lower) && !cues.linkPressure),
    moneyAsk: MONEY_ASK.test(lower),
    hypothetical: EDUCATIONAL.test(lower) && HYPOTHETICAL.test(lower) && /\?\s*$/.test(lower)
  };
  const requestedAction = cues.credential ? 'share_credentials'
    : (cues.transfer || cues.safeAccount) ? 'move_money'
    : cues.remoteAccess ? 'grant_remote_access'
    : cues.linkPressure || /\b(click|open|download|install)\b/.test(lower) ? 'open_or_install'
    : 'information_or_advice';
  const anyCue = Object.values(cues).some(Boolean);
  const confidence = text.length < 12 ? 0.35 : (anyCue ? 0.88 : 0.72);
  return {
    originalText: text,
    detectedLanguage: detectLanguage(text),
    languageCoverage: detectLanguage(text) === 'ar' ? 'limited_arabic_safety_lexicon' : 'english_rules',
    intent: (cues.transfer || cues.safeAccount) ? 'financial_action_request'
      : cues.credential ? 'credential_request'
      : requestedAction === 'open_or_install' ? 'link_or_install_request'
      : 'general_request',
    requestedAction,
    entities: {
      mentionsBank: /\bbank\b/i.test(text),
      mentionsAccountThreat: /\b(account|card)\b/i.test(text) && cues.threat,
      mentionsMoney: cues.transfer
    },
    cues,
    context,
    confidence,
    needsClarification: confidence < 0.6
  };
}

function retrievePersonalContext(profile, request) {
  const lower = request.originalText.toLowerCase();
  const contracts = (profile.calmStateContracts || []).filter(c =>
    c.status === 'active' && (!c.expiresAt || Date.parse(c.expiresAt) > Date.now()) &&
    c.trigger.some(t => lower.includes(t.toLowerCase()))
  );
  const preferences = profile.preferences || [];
  const persistedMemories = memoryStore.retrieve(profile.id, request.originalText);
  return {
    profileId: profile.id,
    profileType: profile.profileType,
    relevantPreferences: preferences.filter(p =>
      ['plain language', 'time to think', 'independent verification'].includes(p)
    ),
    trustedChannels: profile.trustedChannels || [],
    wisdomGraph: buildWisdomGraph(persistedMemories),
    recalledContracts: [...contracts.map(c => ({
      id: c.id,
      commitment: c.commitment,
      source: c.source
    })), ...persistedMemories.filter(m => m.type === 'commitment').map(m => ({id:m.id, commitment:m.content, source:'consented_personal_wisdom_graph'}))]
  };
}

// Named scam patterns. A HIGH pattern means the combination of cues matches a
// documented scam typology; MEDIUM means "verify independently before acting".
// Patterns are deterministic, explainable and auditable; an optional language
// model may raise (never lower) the result — see applyModelRiskSignal.
const SCAM_PATTERNS = Object.freeze([
  { id: 'credential_request', level: 'HIGH', reason: 'Someone is asking for a security code, PIN, password or card details',
    test: (c, x) => c.credential && !x.selfRequestedCode && !x.educational && (x.thirdParty || c.urgency || c.impersonation || c.tooGoodToBeTrue || c.linkPressure || c.injection) },
  { id: 'device_takeover', level: 'HIGH', reason: 'Request to install software or share the screen with someone else',
    test: (c, x) => c.remoteAccess && !x.educational },
  { id: 'safe_account', level: 'HIGH', reason: 'Instruction to move money to a so-called “safe” or new account',
    test: c => c.safeAccount },
  { id: 'instruction_override', level: 'HIGH', reason: 'Text tries to override safety instructions or the person’s own boundary',
    test: c => c.injection },
  { id: 'prize_or_guaranteed_return', level: 'HIGH', reason: 'Prize, winnings or guaranteed-return promise linked to money or details',
    test: c => c.tooGoodToBeTrue && (c.transfer || c.credential || c.upfrontFee || c.linkPressure) },
  { id: 'advance_fee', level: 'HIGH', reason: 'An up-front fee is demanded before something is released or received',
    test: (c, x) => c.upfrontFee && (x.thirdParty || c.tooGoodToBeTrue || c.impersonation || c.linkPressure) },
  { id: 'family_emergency_money', level: 'HIGH', reason: 'Family emergency story combined with pressure to send money',
    test: c => c.familyEmergency && c.transfer && (c.urgency || c.secrecy || c.newContact) },
  { id: 'romance_money', level: 'HIGH', reason: 'Online relationship with someone never met, asking for money',
    test: c => c.romance && c.transfer },
  { id: 'gift_cards_or_untraceable', level: 'HIGH', reason: 'Request to pay with gift cards, crypto or cash-transfer services',
    test: (c, x, lower) => x.thirdParty && /\b(gift ?cards?|itunes|google play cards?|apple (?:gift )?cards?|western union|moneygram|crypto|bitcoin|usdt)\b/.test(lower) && (c.urgency || c.secrecy || c.newContact || c.familyEmergency || c.impersonation || c.upfrontFee) },
  { id: 'secrecy_with_money', level: 'HIGH', reason: 'Secrecy demanded around money or security codes',
    test: c => c.secrecy && (c.transfer || c.credential) },
  { id: 'impersonation_pressure', level: 'HIGH', reason: 'An institution is impersonated with threats or urgency to make you pay or click',
    test: (c, x) => x.thirdParty && c.impersonation && (c.threat || c.urgency) && (c.transfer || c.linkPressure || c.credential) },
  { id: 'phishing_payment_link', level: 'HIGH', reason: 'Payment, card details or an account “fix” requested through an unverified link',
    test: (c, x) => x.thirdParty && c.linkPressure && (((c.transfer || c.upfrontFee || c.credential) && (c.impersonation || c.threat || c.urgency || c.tooGoodToBeTrue)) || (c.threat && (c.urgency || c.impersonation))) },
  { id: 'urgent_new_payee', level: 'HIGH', reason: 'Payment to a new or changed beneficiary that someone else is pushing',
    test: (c, x) => (c.payeeChange && c.transfer && (c.urgency || c.secrecy || x.thirdParty)) || (x.thirdParty && c.personalAccount && c.transfer && (c.urgency || c.secrecy)) },
  { id: 'third_party_money_request', level: 'MEDIUM', reason: 'Someone else is asking you to pay or move money',
    test: (c, x) => x.thirdParty && c.transfer && !x.officialOrRoutine },
  { id: 'payee_change', level: 'MEDIUM', reason: 'Bank or payee details have been changed',
    test: c => c.payeeChange },
  { id: 'identity_probe', level: 'MEDIUM', reason: 'An unverified contact is asking for identity details',
    test: (c, x) => x.thirdParty && c.identityRequest },
  { id: 'receive_money_link', level: 'MEDIUM', reason: 'A link is offered to “receive” money — a common card-harvesting trick',
    test: (c, x) => x.thirdParty && c.receiveLink },
  { id: 'family_emergency', level: 'MEDIUM', reason: 'Family emergency story — confirm directly with the family member',
    test: c => c.familyEmergency && (c.transfer || c.newContact) },
  { id: 'threat_from_institution', level: 'MEDIUM', reason: 'Threat language attributed to an institution',
    test: (c, x) => x.thirdParty && c.impersonation && c.threat }
]);

function assessRisk(request) {
  const c = request.cues;
  const x = request.context || { thirdParty: true, selfInitiated: false, educational: false, selfRequestedCode: false, officialOrRoutine: false };
  const lower = normalizeSafetyText(request.originalText);
  const factors = [
    ['urgency', 20, 'Pressure or urgency language'],
    ['transfer', 25, 'Money movement or payment instruction'],
    ['secrecy', 20, 'Secrecy request'],
    ['credential', 35, 'Request for credentials or security code'],
    ['threat', 15, 'Threat or consequence language'],
    ['impersonation', 10, 'Authority or institution impersonation cue'],
    ['remoteAccess', 35, 'Remote-device access or screen-sharing request'],
    ['linkPressure', 15, 'Instruction to open an unverified link, app or QR code'],
    ['tooGoodToBeTrue', 25, 'Prize or guaranteed-return promise'],
    ['upfrontFee', 25, 'Up-front fee request'],
    ['safeAccount', 40, 'Request to move money to a “safe” account'],
    ['injection', 30, 'Attempt to override instructions'],
    ['familyEmergency', 20, 'Family emergency story'],
    ['newContact', 15, 'New or unverified contact'],
    ['payeeChange', 20, 'Change of payee details'],
    ['identityRequest', 15, 'Request for identity details']
  ];
  const reasons = factors.filter(([key]) => c[key]).map(([, weight, reason]) => ({ weight, reason }));
  let score = Math.min(100, reasons.reduce((sum, item) => sum + item.weight, 0));
  const matchedPatterns = SCAM_PATTERNS.filter(p => p.test(c, x, lower)).map(({ id, level, reason }) => ({ id, level, reason }));
  const patternLevel = matchedPatterns.some(p => p.level === 'HIGH') ? 'HIGH' : matchedPatterns.length ? 'MEDIUM' : 'LOW';
  // A self-initiated, routine or educational request with no third party and no
  // scam pattern is guidance only: keep the cue score visible but do not alarm.
  const routineNotice = patternLevel !== 'HIGH' && x.notice && !x.moneyAsk && !c.linkPressure && !c.remoteAccess && !c.secrecy && !c.safeAccount && !c.injection
    && !matchedPatterns.some(p => ['payee_change', 'family_emergency', 'identity_probe'].includes(p.id));
  const dampened = routineNotice || (patternLevel !== 'HIGH' && x.hypothetical) || (patternLevel === 'LOW' && !x.thirdParty && (x.educational || x.selfInitiated || x.selfRequestedCode || x.officialOrRoutine));
  const weightedLevel = score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  let level = dampened ? 'LOW' : (order[patternLevel] >= order[weightedLevel] ? patternLevel : weightedLevel);
  if (level === 'HIGH') score = Math.max(score, 75);
  if (level === 'MEDIUM') score = Math.min(Math.max(score, 40), 59);
  if (level === 'LOW') score = Math.min(score, 29);
  return { score, level, reasons, matchedPatterns, dampened, method: 'deterministic_pattern_rules_v2' };
}

// Optional language-model signal. It can only RAISE the deterministic level
// (never lower it), and it cannot authorise any action.
function applyModelRiskSignal(risk, signal) {
  if (!signal || typeof signal !== 'object') return risk;
  const order = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const proposed = String(signal.level || '').toUpperCase();
  if (!(proposed in order) || order[proposed] <= order[risk.level]) {
    return { ...risk, modelSignal: { level: proposed || 'NONE', applied: false, reason: 'Model cannot lower or equal the deterministic level' } };
  }
  const score = proposed === 'HIGH' ? Math.max(risk.score, 75) : Math.max(risk.score, 40);
  const reason = String(signal.reason || 'Language model recognised a possible scam pattern').slice(0, 200);
  return { ...risk, level: proposed, score, reasons: [...risk.reasons, { weight: 0, reason: `AI risk signal: ${reason}` }],
    modelSignal: { level: proposed, applied: true, reason, scamType: String(signal.scamType || '').slice(0, 60) } };
}

function evaluatePolicy(request, risk, context) {
  const contractMatched = context.recalledContracts.length > 0;
  const protectedAction = ['move_money', 'share_credentials', 'grant_remote_access', 'open_or_install'].includes(request.requestedAction);
  const deny = protectedAction && risk.level === 'HIGH';
  return {
    decision: deny ? 'DENY_SYNTHETIC_ACTION'
      : risk.level === 'HIGH' ? 'PAUSE_AND_ESCALATE'
      : risk.level === 'MEDIUM' ? 'REQUIRE_INDEPENDENT_VERIFICATION'
      : 'ALLOW_INFORMATIONAL_GUIDANCE_ONLY',
    protectedAction,
    actionBlocked: deny,
    contractMatched,
    consentRequiredForAnyTool: true,
    externalExecutionEnabled: false,
    explanation: deny
      ? 'High-risk financial or credential action is outside this prototype’s permitted authority.'
      : 'This prototype provides guidance only; it does not execute external actions.'
  };
}

function buildResponse(request, risk, context, ripple, policy) {
  const contract = context.recalledContracts[0];
  if (request.needsClarification) {
    return 'I may not have enough detail to understand this request. Could you share the exact message or explain what action is being requested?';
  }
  const opening = contract
    ? `You previously asked me to remind you: “${contract.commitment}” `
    : '';
  const top = (risk.matchedPatterns || [])[0];
  const why = top ? `${top.reason}. ` : `This request contains ${risk.reasons.map(r => r.reason.toLowerCase()).join(', ')}. `;
  if (policy.actionBlocked || risk.level === 'HIGH') {
    return `Salma, pause for a moment. ${opening}This looks like a known scam pattern: ${why}Do not transfer money, share a security code, grant remote access or install anything from the request. Verify independently using ${context.trustedChannels[0] || 'a trusted official channel'}.`;
  }
  if (risk.level === 'MEDIUM') {
    return `Salma, let's take a moment to check this. ${opening}${top ? why : 'I noticed some warning signs. '}Please verify the request through a separate trusted channel before acting.`;
  }
  return 'Salma, I can help you understand this request. Review the details carefully, and ask me if you would like help checking it.';
}

function runSalmaJourney(message, options = {}) {
  const steps = Array.isArray(options.trace) ? options.trace : null;
  let last = process.hrtime.bigint();
  const mark = (step, detail) => { if (!steps) return; const now = process.hrtime.bigint(); steps.push({ step, ms: Math.round(Number(now - last) / 1e3) / 1000, ...detail }); last = now; };
  const profile = options.profile || loadProfile();
  const request = extractRequest(message);
  mark('understand', { intent: request.intent, requestedAction: request.requestedAction, language: request.detectedLanguage, confidence: request.confidence });
  const context = retrievePersonalContext(profile, request);
  mark('recall_profile_promises', { recalled: context.recalledContracts.length });
  const ruleRisk = assessRisk(request);
  mark('match_scam_patterns', { level: ruleRisk.level, score: ruleRisk.score, patterns: (ruleRisk.matchedPatterns || []).map(p => p.id), dampened: ruleRisk.dampened || null });
  const risk = applyModelRiskSignal(ruleRisk, options.modelRiskSignal);
  mark('apply_ai_signal', { offered: Boolean(options.modelRiskSignal), applied: Boolean(risk.modelSignal && risk.modelSignal.applied), finalLevel: risk.level, rule: 'AI may raise the level, never lower it' });
  const ripple = evaluateLifeRipple(request, risk, context.wisdomGraph);
  mark('map_consequences', { domains: Array.isArray(ripple.domains) ? ripple.domains : [] });
  const policy = evaluatePolicy(request, risk, context);
  mark('policy', { decision: policy.decision, protectedAction: policy.protectedAction });
  const englishResponse = buildResponse(request, risk, context, ripple, policy);
  const baseResponse = request.detectedLanguage === 'ar'
    ? (request.needsClarification
      ? 'لم أفهم الطلب بالكامل. هل يمكنك توضيح الرسالة أو الإجراء المطلوب؟'
      : policy.actionBlocked
        ? 'يرجى التوقف لحظة. يحتوي هذا الطلب على مؤشرات خطر مثل الاستعجال أو طلب تحويل الأموال أو التهديد. لا تحوّل المال ولا تشارك رموز الأمان. تواصل مع البنك عبر رقم رسمي موثوق تحصل عليه بشكل مستقل.'
        : risk.level === 'MEDIUM'
          ? 'يرجى التحقق من هذا الطلب عبر قناة رسمية مستقلة قبل اتخاذ أي إجراء. لا تتصرف تحت الضغط.'
          : 'يمكنني مساعدتك في فهم هذا الطلب. راجع التفاصيل بعناية، ويمكنك أن تطلب مني توضيحها.')
    : englishResponse;
  const protectionPlan = buildProtectionPlan({ request, context, risk, ripple, policy });
  mark('protection_plan', { posture: protectionPlan.posture });
  // Family Verification Question: a cloned voice cannot know the family's agreed answer.
  const familyQuestions = Array.isArray(options.familyQuestions) ? options.familyQuestions.slice(0, 3) : [];
  const familyCheck = familyCheckApplies(request)
    ? { applies: true, questions: familyQuestions.map(({ id, question }) => ({ id, question })),
        suggestion: familyQuestions.length
          ? `Before anything else, ask the caller your family question: “${familyQuestions[0].question}” A cloned voice cannot know the answer.`
          : 'If the caller says they are family, hang up and call them back on a number you already know.',
        authorization: false }
    : { applies: false, questions: [], authorization: false };
  mark('family_check', { applies: familyCheck.applies, questionOffered: familyCheck.questions.length > 0 });
  const response = familyCheck.applies
    ? `${baseResponse} ${request.detectedLanguage === 'ar'
        ? (familyQuestions.length ? `قبل أي شيء، اسأل المتصل سؤال العائلة: «${familyQuestions[0].question}»` : 'إذا قال المتصل إنه من العائلة، أغلق الخط واتصل به على رقم تعرفه مسبقاً.')
        : familyCheck.suggestion}`
    : baseResponse;

  const toolPlan = policy.actionBlocked
    ? { name: null, status: 'not_invoked', reason: 'Protected action blocked by policy' }
    : { name: 'create_verification_checklist', status: 'available_with_explicit_user_consent', reason: 'Local-only checklist; no external contact or action' };

  const audit = {
    timestamp: new Date().toISOString(),
    profileId: profile.id,
    intent: request.intent,
    requestedAction: request.requestedAction,
    confidence: request.confidence,
    risk: risk.level,
    riskScore: risk.score,
    recalledContractIds: context.recalledContracts.map(c => c.id),
    policyDecision: policy.decision,
    toolPlan,
    protectionPosture: protectionPlan.posture,
    familyCheckSuggested: familyCheck.applies,
    externalActionTaken: false
  };

  return {
    greeting: 'Hello, Salma. This is your AI agent, Yumma.',
    request,
    context,
    risk,
    ripple,
    policy,
    protectionPlan,
    familyCheck,
    response,
    toolPlan,
    action: policy.actionBlocked ? 'BLOCKED_SYNTHETIC_ACTION' : 'NO_EXTERNAL_ACTION',
    audit
  };
}

module.exports = {
  ALLOWED_TOOLS,
  extractRequest,
  normalizeSafetyText,
  detectLanguage,
  retrievePersonalContext,
  assessRisk,
  applyModelRiskSignal,
  SCAM_PATTERNS,
  evaluateLifeRipple,
  evaluatePolicy,
  runSalmaJourney
};
