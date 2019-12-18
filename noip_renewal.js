const NoIP = require('./services/NoIP');

const [,, ...args] = process.argv;

const noIp = new NoIP();
noIp.doLogin(args[0], args[1]).then(() => {
    noIp.refreshHosts().then((response) => {
        console.log( response );
    })
}).catch((error) => {
    console.error(error)
});