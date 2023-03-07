importScripts("websocketawake.js");

const DEBUG_MODE = false;
const NOTIFICATION_MESSAGE = "Donc là tu vois la notif, mais tu cliques pas ? Rejoins-nous !";
const NOTIFICATION_OPTIONS = {
    "type": "basic",
    "iconUrl": "/assets/128.png",
};

const ws = new WebSocket(DEBUG_MODE ? "ws://localhost:4001" : "ws://bretheskevin.fr:4001");

ws.addEventListener('open', () => {
    console.log('WebSocket connection opened');
});

ws.addEventListener('message', async (event) => {
    let data = JSON.parse(event.data);
    let value = data.data;


    switch (data.key) {
        case "stream":
            streamEvent(value);
            break;
        case "custom-notif":
            customNotifEvent(value);
            break;
    }
});

async function streamEvent(currentData) {
    const previousData = await getPreviousData();

    if (shouldSendNotification(previousData, currentData)) {
        await setPreviousData(currentData);

        browser.notifications.create({
            ...NOTIFICATION_OPTIONS,
            "title": currentData.title,
            "message": NOTIFICATION_MESSAGE
        });
    }
}

function customNotifEvent(data) {
    browser.notifications.create({
        ...NOTIFICATION_OPTIONS,
        "title": data.title,
        "message": data.message
    });
}

browser.notifications.onClicked.addListener(() => {
    browser.tabs.create({url: 'https://kick.com/thevivi'});
});

async function getPreviousData() {
    const result = await browser.storage.local.get("thevivi");
    return result.thevivi || {
        "isLive": false,
        "lastLive": null,
        "title": ""
    };
}

async function setPreviousData(data) {
    await browser.storage.local.set({thevivi: data});
}

function shouldSendNotification(previousData, currentData) {
    return (currentData.lastLive > previousData.lastLive) && (currentData.lastLive !== null);
}


// Keep the service worker alive (thanks google  for making things more complicated than they should be)

const INTERNAL_TESTALIVE_PORT = "DNA_Internal_alive_test";

const startSeconds = 1;
const nextSeconds = 25;
const SECONDS = 1000;
const DEBUG = false;

let alivePort = null;
let isFirstStart = true;
let isAlreadyAwake = false;
let timer = startSeconds*SECONDS;

let firstCall;
let lastCall;

let wakeup = undefined;
let wsTest = undefined;
let wCounter = 0;

const starter = `-------- >>> ${convertNoDate(Date.now())} UTC - Service Worker with HIGHLANDER DNA is starting <<< --------`;

// Websocket test
webSocketTest();

console.log(starter);

// Start Highlander
letsStart();

// ----------------------------------------------------------------------------------------
function letsStart() {
    if (wakeup === undefined) {
        isFirstStart = true;
        isAlreadyAwake = true;
        firstCall = Date.now();
        lastCall = firstCall;
        //timer = startSeconds*SECONDS;
        timer = 300;

        wakeup = setInterval(Highlander, timer);
        console.log(`-------- >>> Highlander has been started at ${convertNoDate(firstCall)}`);
    }
}
// ----------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------
// WebSocket test
function webSocketTest() {
    connectToWS();

    if (webSocket !== undefined) {
        if (wsTest === undefined) {
            wsTest = setInterval(sendMsg, 30000);
        }
    }
}
// ----------------------------------------------------------------------------------------

browser.runtime.onInstalled.addListener(
    async () => await initialize()
);

browser.tabs.onCreated.addListener(onCreatedTabListener);
browser.tabs.onUpdated.addListener(onUpdatedTabListener);
browser.tabs.onRemoved.addListener(onRemovedTabListener);

// Clears the Highlander interval when browser closes.
// This allows the process associated with the extension to be removed.
// Normally the process associated with the extension once the host browser is closed
// will be removed after about 30 seconds at maximum (from Chromium 110 up, before was 5 minutes).
// If the browser is reopened before the system has removed the (pending) process,
// Highlander will be restarted in the same process which will be not removed anymore.
browser.windows.onRemoved.addListener( (windowId) => {
    wCounter--;
    if (wCounter > 0) {
        return;
    }

    // Browser is closing: no more windows open. Clear Highlander interval (or leave it active forever).
    // Shutting down Highlander will allow the system to remove the pending process associated with
    // the extension in max. 30 seconds (from Chromium 110 up, before was 5 minutes).
    if (wakeup !== undefined) {
        // If browser will be open before the process associated to this extension is removed,
        // setting this to false will allow a new call to letsStart() if needed
        // ( see windows.onCreated listener )
        isAlreadyAwake = false;

        // if you don't need to maintain the service worker running after the browser has been closed,
        // just uncomment the "# shutdown Highlander" rows below (already uncommented by default)
        sendMsg("Shutting down Highlander", false); // # shutdown Highlander
        clearInterval(wakeup);                      // # shutdown Highlander
        wakeup = undefined;                         // # shutdown Highlander

    }

    // Websocket: closes connection and clears interval
    // If you don't need to maintain Websocket connection active after the browser has been closed,
    // just uncomment the "# shutdown websocket" rows below (already uncommented by default)
    // and, if needed, the "# shutdown Highlander" rows to shutdown Highlander.
    if (wsTest !== undefined) { // # shutdown websocket
        closeConn();            // # shutdown websocket
        clearInterval(wsTest);  // # shutdown websocket
        wsTest = undefined;     // # shutdown websocket
    }                           // # shutdown websocket
});

browser.windows.onCreated.addListener( async (window) => {
    let w = await browser.windows.getAll();
    wCounter = w.length;
    if (wCounter === 1) {
        updateJobs();
    }
});

async function updateJobs() {
    if (isAlreadyAwake === false) {
        letsStart();
    }

    // WebSocket test
    webSocketTest();
}

async function checkTabs() {
    let results = await browser.tabs.query({});
    results.forEach(onCreatedTabListener);
}

function onCreatedTabListener(tab) {
    if (DEBUG) console.log("Created TAB id=", tab.id);
}

function onUpdatedTabListener(tabId, changeInfo, tab) {
    if (DEBUG) console.log("Updated TAB id=", tabId);
}

function onRemovedTabListener(tabId) {
    if (DEBUG) console.log("Removed TAB id=", tabId);
}

// ---------------------------
// HIGHLANDER
// ---------------------------
async function Highlander() {

    const now = Date.now();
    const age = now - firstCall;
    lastCall = now;

    const str = `HIGHLANDER ------< ROUND >------ Time elapsed from first start: ${convertNoDate(age)}`;
    sendMsg(str, false)
    if (webSocket === undefined)
        console.log(str)

    if (alivePort == null) {
        alivePort = browser.runtime.connect({name:INTERNAL_TESTALIVE_PORT})

        alivePort.onDisconnect.addListener( (p) => {
            if (browser.runtime.lastError){
                if (DEBUG) console.log(`(DEBUG Highlander) Expected disconnect error. ServiceWorker status should be still RUNNING.`);
            } else {
                if (DEBUG) console.log(`(DEBUG Highlander): port disconnected`);
            }

            alivePort = null;
        });
    }

    if (alivePort) {

        alivePort.postMessage({content: "ping"});

        if (browser.runtime.lastError) {
            if (DEBUG) console.log(`(DEBUG Highlander): postMessage error: ${browser.runtime.lastError.message}`)
        } else {
            if (DEBUG) console.log(`(DEBUG Highlander): "ping" sent through ${alivePort.name} port`)
        }
    }

    if (isFirstStart) {
        isFirstStart = false;
        setTimeout( () => {
            nextRound();
        }, 100);
    }

}

function convertNoDate(long) {
    var dt = new Date(long).toISOString()
    return dt.slice(-13, -5) // HH:MM:SS only
}

function nextRound() {
    clearInterval(wakeup);
    timer = nextSeconds*SECONDS;
    wakeup = setInterval(Highlander, timer);
}

async function initialize() {
    await checkTabs();
    updateJobs();
}
