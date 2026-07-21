const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'frontend', 'public', 'cities');

// Create the public/cities folder if it doesn't exist
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const cities = [
    { name: 'Bangalore', url: 'https://assets.nobroker.in/nob-common/Banglore.png' },
    { name: 'Mumbai', url: 'https://assets.nobroker.in/nob-common/Mumbai.png' },
    { name: 'Pune', url: 'https://assets.nobroker.in/nob-common/Pune.png' },
    { name: 'Chennai', url: 'https://assets.nobroker.in/nob-common/Chennai.png' },
    { name: 'Hyderabad', url: 'https://assets.nobroker.in/nob-common/Hyderabad.png' },
    { name: 'Delhi NCR', url: 'https://assets.nobroker.in/hs-new/public/Common/delhi.png' },
    { name: 'Kolkata', url: 'https://assets.nobroker.in/hs-new/public/Common/Kolkata.png' },
    { name: 'Surat', url: 'https://assets.nobroker.in/hs-new/public/Common/Suarat.png' },
    { name: 'Indore', url: 'https://assets.nobroker.in/hs-new/public/Common/Indore.png' },
    { name: 'Jaipur', url: 'https://assets.nobroker.in/hs-new/public/Common/Jaipur.png' },
    { name: 'Coimbatore', url: 'https://assets.nobroker.in/hs-new/public/Common/Coimbatore.png' },
    { name: 'Ahmedabad', url: 'https://assets.nobroker.in/nob-common/Ahmedabad.png' }
];

let downloaded = 0;

console.log('Starting download of city images...');

cities.forEach(c => {
    const filename = c.name.toLowerCase().replace(' ', '_') + '.png';
    const filePath = path.join(dir, filename);
    
    https.get(c.url, (res) => {
        if (res.statusCode !== 200) {
            console.error(`Failed to download ${c.name} (Status Code: ${res.statusCode})`);
            return;
        }

        const fileStream = fs.createWriteStream(filePath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ Downloaded ${c.name} -> ${filename}`);
            downloaded++;
            if (downloaded === cities.length) {
                console.log('\n🎉 All images downloaded successfully! You can now use local paths in your frontend.');
            }
        });
    }).on('error', (err) => {
        console.error(`❌ Error downloading ${c.name}: ${err.message}`);
    });
});
