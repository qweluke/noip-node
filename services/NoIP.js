const rp = require('request-promise');
const tough = require('tough-cookie');
const { parse } = require('node-html-parser');


class NoIP {
    _login = undefined;
    _password = undefined;
    _host = "https://www.noip.com";
    _hostApi = "https://my.noip.com/api";
    _cookie = undefined;
    _token = undefined;

    constructor() {
        this._cookie = new tough.Cookie({
            domain: 'noip.com',
            httpOnly: true,
            maxAge: 31536000
        });
    }

    refreshLoginToken = async () => {
        const options = {
            uri: `${this._host}/login`,
            method: 'GET',
            jar: this._cookie,
        };

        return rp(options).then((htmlString) => {
            const root = parse(htmlString);

            this._token = root.querySelectorAll("input").filter((input) => {
                return input.rawAttrs.includes("_token");
            })[0].attributes.value;
            return this._token;
        });
    };

    doLogin = async (login, password) => {
        this._login = login;
        this._password = password;

        if(!this._token) {
            await this.refreshLoginToken();
        }

        const post = {
            "submit_login_page": 1,
            "_token": this._token,
            'Login': null,
            "username": this._login,
            "password": this._password
        };

        const options = {
            uri: `${this._host}/login`,
            method: 'POST',
            followAllRedirects: true,
            form: post,
            jar: this._cookie,
        };


        return rp(options)
            .then((htmlString) => {
                const root = parse(htmlString);
                const isError = root.querySelector('.alert.alert-error');

                if(isError) {
                    throw Error(isError.text.trim());
                }
        });
    };

    getHosts = async () => {

        const options = {
            uri: `${this._hostApi}/host`,
            followAllRedirects: true,
            headers: {
                'X-CSRF-TOKEN': this._token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            jar: this._cookie,
        };

        return rp(options);
    };

    refreshHosts = async () => {
        const refreshed = [];
        const noNeed = [];
        return this.getHosts().then((response) => {
            const json = JSON.parse(response);
            json.hosts.forEach((host) => {
                if(host.days_remaining <= 5) {
                    const options = {
                        uri: `${this._hostApi}/host/${host.id}/touch`,
                        followAllRedirects: true,
                        headers: {
                            'X-CSRF-TOKEN': this._token,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        jar: this._cookie,
                    };

                    rp(options)
                        .then((response) => refreshed.push(JSON.parse(response)))
                } else {
                    noNeed.push(host)
                }
            });

            return {
                refreshed,
                noNeed
            }
        });
    }
}

module.exports = NoIP;