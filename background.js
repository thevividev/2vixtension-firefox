let api_url = "https://bretheskevin.fr/public-api/thevivi/is-streaming";
let previousData = {
    "isLive": false,
    "lastLive": null,
    "title": ""
};
setPreviousData();

setInterval(async () => {
    getPreviousData();

    let response = await fetch(api_url);
    let data = await response.json();

    if (shouldSendNotification(previousData, data)) {
        setPreviousData();

        browser.notifications.create({
            "type": "basic",
            "iconUrl": "/assets/128.png",
            "title": data.title,
            "message": "Donc là tu vois la notif, mais tu cliques pas ? Rejoins-nous !"
        });
    }
}, 5000);

browser.notifications.onClicked.addListener(function(event){
    browser.tabs.create({url: 'https://kick.com/thevivi'});
});

function getPreviousData() {
    browser.storage.sync.get("thevivi").then((result) => {
        previousData = result.thevivi;
    });
}

function setPreviousData() {
    browser.storage.sync.set({thevivi: previousData});
}

function shouldSendNotification(previousData, data) {
    return data.isLive && !previousData.isLive && (data.lastLive !== previousData.lastLive);
}