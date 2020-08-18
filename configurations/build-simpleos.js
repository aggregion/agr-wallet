const fs = require('fs');

const conf = require('../package.json');

conf.compilerVersion = "DEFAULT";
conf.name = 'agg-wallet';
conf.appId = "com.aggregion.agg-wallet";
conf.productName = 'agg-wallet';
conf.description = 'Aggregion Blockchain Interface & Wallet';
conf.build.appId = 'agg-wallet';

// icons
conf.build.win.icon = "icons/simpleos/icon.ico";
conf.build.mac.icon = "icons/simpleos/icon.icns";
conf.build.linux.icon = "icons/simpleos";
conf.build.linux.executableName = "agg-wallet";
conf.build.linux.desktop = {
    "Name": "AGR Wallet",
    "GenericName": "AGR Wallet",
    "X-GNOME-FullName": "agg-wallet",
    "Comment": "Aggregion Blockchain Wallet",
    "Type": "Application",
    "Terminal": "false",
    "StartupNotify": "false",
    "Categories": "Network;"
};

fs.writeFileSync('./package.json', JSON.stringify(conf, null, "\t"));

