let api_url = "https://bretheskevin.fr/public-api/thevivi/is-streaming";
let previousData = {
    "isLive": false,
    "lastLive": null,
    "title": ""
};

const ws = new WebSocket('ws://localhost:4001');

ws.addEventListener('open', (event) => {
    console.log('WebSocket connection opened');
});

ws.addEventListener('message', async (event) => {
    getPreviousData();

    let data = JSON.parse(event.data);

    if (shouldSendNotification(previousData, data)) {
        setPreviousData();

        browser.notifications.create({
            "type": "basic",
            "iconUrl": "/assets/128.png",
            "title": data.title,
            "message": "Donc là tu vois la notif, mais tu cliques pas ? Rejoins-nous !"
        });
    }
});

browser.notifications.onClicked.addListener(function(event){
    browser.tabs.create({url: 'https://kick.com/thevivi'});
});

function getPreviousData() {
    browser.storage.sync.get("thevivi").then((result) => {
        previousData = result.thevivi || previousData;
    });
}

function setPreviousData(data) {
    previousData = data;
    browser.storage.sync.set({thevivi: previousData});
}

function shouldSendNotification(previousData, data) {
    return data.isLive &&
        !previousData.isLive &&
        (data.lastLive !== previousData.lastLive) &&
        (data.lastLive !== null);
}