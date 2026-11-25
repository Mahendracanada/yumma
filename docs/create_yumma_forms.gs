/**
 * Yumma: creates my three Google Forms in one run.
 *   1. Yumma family survey (anonymous, 10 questions)
 *   2. Yumma pilot sign-up (shown after the survey, so the survey stays anonymous)
 *   3. Yumma blind test (colleagues write messages Yumma has never seen)
 *
 * How: go to https://script.google.com → New project → paste this file → Run "createYummaForms"
 * → allow access. The links appear under View → Logs (or Execution log).
 */
function createYummaForms() {
  // ---- 2. Pilot sign-up (created first so the survey can point to it)
  const signup = FormApp.create('Yumma pilot sign-up');
  signup.setDescription('Thank you for your interest in Yumma, an AI agent that helps a person pause before a pressured money decision. ' +
    'I’ll contact you about the free 12-week pilot in early 2027. Your details are used only for that. Mahendra Dhillon');
  signup.addTextItem().setTitle('Your name').setRequired(true);
  signup.addTextItem().setTitle('Email or WhatsApp number').setRequired(true);
  signup.addMultipleChoiceItem().setTitle('Who would use Yumma?')
    .setChoiceValues(['Me', 'A parent or older relative', 'Both']).setRequired(false);
  signup.setConfirmationMessage('Thank you. I’ll be in touch before the pilot starts.');

  // ---- 1. Anonymous family survey
  const survey = FormApp.create('Yumma family survey (anonymous, 3 minutes)');
  survey.setCollectEmail(false);
  survey.setDescription('I’m Mahendra Dhillon, and I’m building Yumma, an AI agent that helps a person pause before a pressured money decision. ' +
    'This survey has ten questions and takes about three minutes. It’s anonymous: I don’t collect names, emails or account details, and I report only totals.');
  const mc = (title, choices) => survey.addMultipleChoiceItem().setTitle(title).setChoiceValues(choices).setRequired(true);
  const scale = title => survey.addScaleItem().setTitle(title).setBounds(1, 5).setLabels('Not helpful', 'Very helpful').setRequired(true);
  mc('Where do you live?', ['UAE', 'Another GCC country', 'Elsewhere']);
  mc('Do you help a parent or older relative with money or banking?', ['Regularly', 'Sometimes', 'No']);
  mc('In the last 12 months, has anyone in your family received a call or message pressing them to send money, share a code or click a link?', ['Yes', 'No', 'Not sure']);
  mc('In the last three years, has anyone in your family lost money this way?', ['Yes', 'No', 'Prefer not to say']);
  mc('When something like this happens, when does the family usually find out?', ['Before any money moves', 'After the money has moved', 'Usually never', 'Not sure']);
  scale('A person records a promise while calm, such as “I never send money under pressure; I call my family first.” When a pressured request arrives, they hear it played back in their own voice. How helpful would that be?');
  scale('Before money goes to a “relative in trouble”, Yumma asks the caller a question only your family knows, which a cloned voice can’t answer. How helpful would that be?');
  mc('Which matters most to you? Choose one.', ['My relative stays in control of their own money', 'The family hears in time', 'The payment is stopped', 'Nobody else sees my relative’s accounts or messages']);
  mc('Core protection in Yumma is free. Would your family add AED 5 a month for extra family support features?', ['Yes', 'Maybe', 'No']);
  mc('Would you like to try Yumma in a free 12-week pilot in early 2027? (If yes, a sign-up link appears after you submit.)', ['Yes', 'Maybe later', 'No']);
  survey.setConfirmationMessage('Thank you. If you’d like to join the free pilot, sign up here (separate from this anonymous survey): ' + signup.getPublishedUrl());

  // ---- 3. Blind test for colleagues
  const blind = FormApp.create('Yumma blind test: write messages Yumma has never seen');
  blind.setCollectEmail(false);
  blind.setShowLinkToRespondAgain(true);
  blind.setDescription('Thank you for helping me test Yumma. Please write 10 scam messages, 5 ordinary messages that mention money, codes or banks, ' +
    'and 5 that are genuinely unclear, one message per response (use “Submit another response”). English or Arabic, as tricky as you like. ' +
    'Please invent all names, numbers and links. Mahendra Dhillon');
  blind.addTextItem().setTitle('Your initials (optional)');
  blind.addMultipleChoiceItem().setTitle('Type of message').setChoiceValues(['Scam', 'Ordinary', 'Unsure, could be either']).setRequired(true);
  blind.addMultipleChoiceItem().setTitle('Language').setChoiceValues(['English', 'Arabic', 'Both']).setRequired(true);
  blind.addParagraphTextItem().setTitle('The message').setRequired(true);
  blind.setConfirmationMessage('Thank you. Use “Submit another response” for your next message.');

  Logger.log('Family survey (share this): ' + survey.getPublishedUrl());
  Logger.log('Blind test (send to colleagues): ' + blind.getPublishedUrl());
  Logger.log('Pilot sign-up (linked from the survey): ' + signup.getPublishedUrl());
  Logger.log('Edit links: survey ' + survey.getEditUrl() + ' | blind ' + blind.getEditUrl() + ' | sign-up ' + signup.getEditUrl());
  Logger.log('Responses: in each form, Responses → Link to Sheets, then File → Download → CSV for the blind test.');
}
