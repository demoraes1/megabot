/**
 * Dispositivos móveis disponíveis no rebrowser-puppeteer
 * Apenas smartphones em orientação portrait (vertical)
 * Sincronizado com mobile-devices.json
 */

const puppeteer = require('puppeteer-core');

// Dispositivos móveis organizados por categoria (apenas portrait)
const mobileDevices = {
  "Galaxy S5": {
    "name": "Galaxy S5",
    "userAgent": "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.6167.139 Mobile Safari/537.36",
    "viewport": {
      "width": 360,
      "height": 640,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Galaxy S8": {
    "name": "Galaxy S8",
    "userAgent": "Mozilla/5.0 (Linux; Android 7.0; SM-G950U Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.6167.139 Mobile Safari/537.36",
    "viewport": {
      "width": 360,
      "height": 740,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Galaxy S9+": {
    "name": "Galaxy S9+",
    "userAgent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.6167.139 Mobile Safari/537.36",
    "viewport": {
      "width": 320,
      "height": 658,
      "deviceScaleFactor": 4.5,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 4": {
    "name": "iPhone 4",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53",
    "viewport": {
      "width": 320,
      "height": 480,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 5": {
    "name": "iPhone 5",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
    "viewport": {
      "width": 320,
      "height": 568,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 6": {
    "name": "iPhone 6",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 667,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 6 Plus": {
    "name": "iPhone 6 Plus",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 414,
      "height": 736,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 7": {
    "name": "iPhone 7",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 667,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 7 Plus": {
    "name": "iPhone 7 Plus",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 414,
      "height": 736,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 8": {
    "name": "iPhone 8",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 667,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 8 Plus": {
    "name": "iPhone 8 Plus",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 414,
      "height": 736,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone SE": {
    "name": "iPhone SE",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1",
    "viewport": {
      "width": 320,
      "height": 568,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone X": {
    "name": "iPhone X",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 812,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone XR": {
    "name": "iPhone XR",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 414,
      "height": 896,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 11": {
    "name": "iPhone 11",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 414,
      "height": 828,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 11 Pro": {
    "name": "iPhone 11 Pro",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 812,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 11 Pro Max": {
    "name": "iPhone 11 Pro Max",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 414,
      "height": 896,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 12": {
    "name": "iPhone 12",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 390,
      "height": 844,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 12 Pro": {
    "name": "iPhone 12 Pro",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 390,
      "height": 844,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 12 Pro Max": {
    "name": "iPhone 12 Pro Max",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 428,
      "height": 926,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 12 Mini": {
    "name": "iPhone 12 Mini",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 812,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 13": {
    "name": "iPhone 13",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 390,
      "height": 844,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 13 Pro": {
    "name": "iPhone 13 Pro",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 390,
      "height": 844,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 13 Pro Max": {
    "name": "iPhone 13 Pro Max",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 428,
      "height": 926,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 13 Mini": {
    "name": "iPhone 13 Mini",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 375,
      "height": 812,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 14": {
    "name": "iPhone 14",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 390,
      "height": 663,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 14 Plus": {
    "name": "iPhone 14 Plus",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 428,
      "height": 745,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 14 Pro": {
    "name": "iPhone 14 Pro",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 393,
      "height": 659,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 14 Pro Max": {
    "name": "iPhone 14 Pro Max",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 430,
      "height": 739,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 15": {
    "name": "iPhone 15",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 393,
      "height": 659,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 15 Plus": {
    "name": "iPhone 15 Plus",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 430,
      "height": 739,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 15 Pro": {
    "name": "iPhone 15 Pro",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 393,
      "height": 659,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "iPhone 15 Pro Max": {
    "name": "iPhone 15 Pro Max",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "viewport": {
      "width": 430,
      "height": 739,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Nexus 4": {
    "name": "Nexus 4",
    "userAgent": "Mozilla/5.0 (Linux; Android 4.4.2; Nexus 4 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.6378.61 Mobile Safari/537.36",
    "viewport": {
      "width": 384,
      "height": 640,
      "deviceScaleFactor": 2,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Nexus 5": {
    "name": "Nexus 5",
    "userAgent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.6248.19 Mobile Safari/537.36",
    "viewport": {
      "width": 360,
      "height": 640,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Nexus 5X": {
    "name": "Nexus 5X",
    "userAgent": "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 5X Build/OPR4.170623.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.6034.77 Mobile Safari/537.36",
    "viewport": {
      "width": 412,
      "height": 732,
      "deviceScaleFactor": 2.625,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Nexus 6": {
    "name": "Nexus 6",
    "userAgent": "Mozilla/5.0 (Linux; Android 7.1.1; Nexus 6 Build/N6F26U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.6595.13 Mobile Safari/537.36",
    "viewport": {
      "width": 412,
      "height": 732,
      "deviceScaleFactor": 3.5,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Nexus 6P": {
    "name": "Nexus 6P",
    "userAgent": "Mozilla/5.0 (Linux; Android 8.0.0; Nexus 6P Build/OPP3.170518.006) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.6658.7 Mobile Safari/537.36",
    "viewport": {
      "width": 412,
      "height": 732,
      "deviceScaleFactor": 3.5,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Pixel 2": {
    "name": "Pixel 2",
    "userAgent": "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.6865.32 Mobile Safari/537.36",
    "viewport": {
      "width": 411,
      "height": 731,
      "deviceScaleFactor": 2.625,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Pixel 2 XL": {
    "name": "Pixel 2 XL",
    "userAgent": "Mozilla/5.0 (Linux; Android 8.0.0; Pixel 2 XL Build/OPD1.170816.004) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.6055.7 Mobile Safari/537.36",
    "viewport": {
      "width": 411,
      "height": 823,
      "deviceScaleFactor": 3.5,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Pixel 3": {
    "name": "Pixel 3",
    "userAgent": "Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181105.017.A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.6799.97 Mobile Safari/537.36",
    "viewport": {
      "width": 393,
      "height": 786,
      "deviceScaleFactor": 2.75,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Pixel 4": {
    "name": "Pixel 4",
    "userAgent": "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.6824.53 Mobile Safari/537.36",
    "viewport": {
      "width": 353,
      "height": 745,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Pixel 4a (5G)": {
    "name": "Pixel 4a (5G)",
    "userAgent": "Mozilla/5.0 (Linux; Android 11; Pixel 4a (5G)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.6319.75 Mobile Safari/537.36",
    "viewport": {
      "width": 353,
      "height": 745,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Pixel 5": {
    "name": "Pixel 5",
    "userAgent": "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.6940.33 Mobile Safari/537.36",
    "viewport": {
      "width": 393,
      "height": 851,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  },
  "Moto G4": {
    "name": "Moto G4",
    "userAgent": "Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.6356.65 Mobile Safari/537.36",
    "viewport": {
      "width": 360,
      "height": 640,
      "deviceScaleFactor": 3,
      "isMobile": true,
      "hasTouch": true,
      "isLandscape": false
    }
  }
};

// Função para obter um dispositivo específico
function getDevice(deviceName) {
    return mobileDevices[deviceName] || null;
}

// Função para obter dispositivos Android
function getAndroidDevices() {
    return Object.keys(mobileDevices).filter(name => 
        name.includes('Galaxy') || 
        name.includes('Nexus') || 
        name.includes('Pixel') || 
        name.includes('Moto')
    );
}

// Função para obter dispositivos iOS
function getIosDevices() {
    return Object.keys(mobileDevices).filter(name => 
        name.includes('iPhone')
    );
}

// Função para obter dispositivos Windows Phone
function getWindowsPhoneDevices() {
    return Object.keys(mobileDevices).filter(name => 
        name.includes('Lumia') || 
        name.includes('Nokia')
    );
}

// Função para obter um dispositivo aleatório (apenas portrait)
function getRandomDevice() {
    const deviceNames = Object.keys(mobileDevices);
    const randomName = deviceNames[Math.floor(Math.random() * deviceNames.length)];
    return {
        name: randomName,
        device: mobileDevices[randomName]
    };
}

module.exports = {
    mobileDevices,
    getDevice,
    getAndroidDevices,
    getIosDevices,
    getWindowsPhoneDevices,
    getRandomDevice
};
