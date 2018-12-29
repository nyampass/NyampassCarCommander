const noble = require('noble');
const Local = require('./local_property')

const DeviceName = 'NampassCar';
const ServiceUUIDs = ["713D0000503E4C75BA943148F18D941E".toLowerCase()];
const CharacteristicUUIDs = ["713D0003503E4C75BA943148F18D941E".toLowerCase()];
let Direction = process.argv[2];

function timeout(milli, callback){
  return new Promise((res, rej) => {
    let timer = setTimeout(() => {
      rej('Time out.');
    }, milli);

    callback(res, rej, timer);
  });
}

function connect(peripheral){
  return new Promise((res, rej) => {
    timeout(5000, (timer_res, timer_rej, timer) => {
      peripheral.connect((err) => {
        console.log('connect: ', err);
        clearTimeout(timer);
        if(err) timer_rej(err);
        else timer_res();
      });
    })
    .then(() => {
      res();
    })
    .catch((err) => {
      rej(err);
    })
  });
}

function disconnect(peripheral){
  return new Promise((res, rej) => {
    peripheral.disconnect((err) => {
      if(err) rej(err);
      else res();
    });
  });
}

function findService(peripheral, uuids){
  return new Promise((res, rej) => {
    timeout(5000, (timer_res, timer_rej, timer) => {
      peripheral.discoverServices(uuids, (err, services) => {
        console.log('Services: ', err);
        clearTimeout(timer);
        if(err) timer_rej(err);
        else if(services.length <= 0) timer_rej('No Services');
        else timer_res(services);
      });
    })
    .then((services) => {
      res(services);
    })
    .catch((err) => {
      rej(err);
    });
  });
}

function findCharacteristic(services, uuids){
  return new Promise((res, rej) => {
    services.discoverCharacteristics(uuids, (err, charas) => {
      if(err) rej(err);
      else if(charas.length <= 0) rej('No Characteristics');
      else res(charas);
    });
  });
}

function sendTX(chara, buf){
  return new Promise((res, rej) => {
    if(!Buffer.isBuffer(buf)) rej('Second arg isn\'t Buffer');
    chara.write(buf, false, (err) => {
      if(err) rej();
      else res();
    });
  })
}

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('Power on.');
    noble.startScanning();
  } else {
    console.log('Failed');
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  let deviceName = peripheral.advertisement.localName;

  console.log(deviceName);
  noble.stopScanning();
  if(deviceName == DeviceName){
    connect(peripheral)
      .then(() => {
        console.log('connected');
        return findService(peripheral, ServiceUUIDs);
      })
      .then((services) => {
        console.log('get services');
        return findCharacteristic(services[0], CharacteristicUUIDs);
      })
      .then((charas) => {
        console.log('get charas');
        if(Direction == 'forward') return sendTX(charas[0], Local.forward_command);
        else if(Direction == 'back') return sendTX(charas[0], Local.back_command);
        else return sendTX(charas[0], Local.forward_command);
      })
      .then(() => {
        console.log('Sent.');
        disconnect(peripheral)
          .then(() => {
            console.log('Disconnected')
            process.exit(0);
          })
          .catch(() => { console.log('Failed to disconnect') });
      })
      .catch((err) => {
        console.log('Error: ', err);
        if(err == 'Time out.') process.exit(1);
	disconnect(peripheral)
          .then(() => {
            console.log('Disconnected');
            noble.startScanning();
          })
          .catch(() => { console.log('Failed to disconnect') });
      });
  }else{
    noble.startScanning();
  }
});
