const puppeteer = require('puppeteer');
const crypto = require('crypto');
require('dotenv').config();

const username = process.env.username;
const password = process.env.PASSWORD;

// URL du post à commenter
const postUrl = 'https://www.instagram.com/p/exemple/';


let commentCount = 0;
let commentTimestamps = [];
let browser;
let page;

const generateRandomDelay = (min, max) => {
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = parseInt(randomBytes.toString('hex'), 16);
  const randomFraction = randomNumber / Math.pow(2, 32);
  return randomFraction * (max - min) + min;
};

const login = async () => {
  try {
    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'networkidle2',
    });

    await clickButtonIfExists('button[class="_a9-- _a9_1"]');
    await page.waitForTimeout(generateRandomDelay(2, 3.3) * 1000);
    await typeInField('input[name="username"]', username);
    await page.waitForTimeout(generateRandomDelay(2, 3.3) * 1000);
    await typeInField('input[name="password"]', password);
    await page.waitForTimeout(generateRandomDelay(2, 3.3) * 1000);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);

    await clickButtonIfExists('button[class="_acan _acap _acas _aj1-"]');
    await page.waitForTimeout(generateRandomDelay(2, 3.3) * 1000);
    await clickButtonIfExists('button[class="_a9-- _a9_1"]');
  } catch (error) {
    console.error('Error in login:', error);
    closeBrowserAndRestart();
  }
};

const clickButtonIfExists = async (selector) => {
  if ((await page.$(selector)) !== null) {
    await page.click(selector);
  }
};

const typeInField = async (selector, text) => {
  await page.type(selector, text, {
    delay: generateRandomDelay(45, 102),
  });
};

const commentPost = async () => {
  try {
    await processPostPage();
  } catch (error) {
    console.error('Error in commentPost:', error);
    scheduleNextComment();
  }
};

const processPostPage = async () => {
  const currentUrl = await page.url();
  await page.waitForTimeout(generateRandomDelay(2, 3.3) * 1000);
  if (currentUrl !== postUrl) {
    await page.goto(postUrl, {
      waitUntil: 'networkidle2',
    });
    await page.waitForSelector('textarea');
  }
  await page.focus('textarea');
  const comment = 'Commentaire'; // Commentaire à poster
  await page.keyboard.type(comment, {
    delay: generateRandomDelay(45, 102),
  });
  incrementAndLogCommentCount();
};

const incrementAndLogCommentCount = () => {
  commentCount++;
  commentTimestamps.push(Date.now());
  console.log(`Commentaire posté (${commentCount} au total)`);
};

const setupBrowser = async () => {
  try {
    browser = await puppeteer.launch({ headless: false });
    const pages = await browser.pages();

    if (pages.length === 0) {
      console.log('Error in setupBrowser: No pages available in the browser');
      closeBrowserAndRestart();
    }

    page = pages[0]; // Use the first page
  } catch (error) {
    console.error('Error in setupBrowser:', error);
    closeBrowserAndRestart();
  }
};

const start = async () => {
  try {
    await setupBrowser();
    await login();
    await commentPost();
    scheduleNextComment();
  } catch (error) {
    console.error('Error in start:', error);
    closeBrowserAndRestart();
  }
};

start();

const scheduleNextComment = async () => {
  let delay;
  const timeNow = Date.now();
  commentTimestamps = commentTimestamps.filter(
    (ts) => timeNow - ts <= 24 * 60 * 60 * 1000
  ); // garder les timestamps des 24 dernières heures

  delay = generateRandomDelay(4, 6);
  console.log(`Prochain commentaire dans ${delay.toFixed(2)} minutes`);

  const nextCommentTime = new Date(timeNow + delay * 60 * 1000);
  console.log(
    `Heure du prochain commentaire : ${nextCommentTime.toLocaleString()}`
  );
  setTimeout(async () => {
    try {
      await commentPost(); // Commenter ici
      scheduleNextComment();
    } catch (err) {
      console.log(
        'Une erreur est survenue pendant le commentaire. Tentative de nouvelle tentative...'
      );
      scheduleNextComment();
    }
  }, delay * 60 * 1000);

};

const closeBrowserAndRestart = async () => {
  try {
    if (browser) {
      await browser.close();
      console.log('Browser successfully closed.');
    }
    start();
  } catch (error) {
    console.error('Error in closeBrowserAndRestart:', error);
    process.exit(1); // stop the script
  }
};
