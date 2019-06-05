class StateType {
    constructor(value) {
        this._value = value;
    }
    map(f) {
        return f(this._value);
    }
    update(val) {
        if (val !== null && typeof val !== 'object') {
            if (this._value.prototype.name = 'RState') {
                this._value.update(val);
            }
            else {
                this._value = val;
            }
            return this;
        }

        for (let key in val) {
            if (!Object.getOwnPropertyDescriptor(this._value, key)) {
                throw new Error('Property ' + key + ' does not exist');
            }

            if (this._value[key].constructor && this._value[key].constructor.name === 'RState') {
                this._value[key].update(val[key]);
            }
            else {
                this._value[key] = val[key];
            }
        }
        return this;
    }
}

function defState(__enum__) {
    const enums = Array.prototype.slice.call(arguments);

    function typeName(val) {
        return typeof val === 'object' && '' + val === '[object Object]' && val.constructor && val.constructor.name ? val.constructor.name : val;
    }

    function getType(val) {
        const typeIdx = enums.findIndex(e => {
            return e === val || (e.prototype instanceof StateType && val instanceof e)
        });

        if (typeIdx == -1) {
            return {
                get: function() {
                    throw new Error('No such type: ' + typeName(val));
                },
                then: function (f) {
                    return {
                        else: function (f) {
                            return f(typeName(val));
                        }
                    };
                }
            };
        }

        return {
            get: function() {
                return enums[typeIdx];
            },
            then: function (f) {
                const val = f(enums[typeIdx]);
                return {
                    else: function () {
                        return val;
                    }
                };
            }
        };
    }

    class RState {
        constructor(val_or_func) {
            this.set(val_or_func);
        }

        map(f) {
            if (this._state instanceof StateType) {
                return this._state.map(f);
            }
            return f(this._state);
        }

        set(val) {
            return getType(val)
                .then(type => {
                    if (this._transitions) {
                        if (typeof this._state === 'undefined') {
                            if (!this._transitions.some(transitionArray => transitionArray[0] === type)) {
                                throw new Error('Illegal transition: ' + typeName(this._state) + ' -> ' + typeName(val));
                            }
                        }
                        else {
                            const currentType = getType(this._state).get();
                            if (!this._transitions.some(transitionArray => transitionArray.slice(1).some((t, i) => t === type && currentType === transitionArray[i]))) {
                                throw new Error('Illegal transition: ' + typeName(this._state) + ' -> ' + typeName(val));
                            }
                        }
                    }
        
                    this._state = val;
                    return this;
                })
                .else(name => {
                    if (!this._default) {
                        throw new Error('Illegal argument: ' + name);
                    }
                    return this.set(this._default);
                });
        }

        update(val) {
            if (val !== null && typeof val !== 'object') {
                return this.set(val);
            }
            if (this._state instanceof StateType) {
                this._state.update(val);
                return this;
            }
            for (let key in val) {
                if (!Object.getOwnPropertyDescriptor(this._state, key)) {
                    throw new Error('Property ' + key + ' does not exist');
                }
                else {
                    this._state[key] = val[key];
                }
            }
            return this;
        }

        static transitions(__arrays__) {
            this.prototype._transitions = Array.prototype.slice.call(arguments);
            return this;
        }

        static withDefault(defaultValue) {
            this.prototype._default = defaultValue;
            return this;
        }
    }
    return RState;
}


//-----------------------------------------------------------------------------

class OKState extends StateType {}
class ErrorState extends StateType {}

const State = defState('loading', OKState, ErrorState);//.transitions(['loading', OKState], ['loading', ErrorState]);
const OtherState = defState('loading', 'loaded', 'unloading').transitions(['loading', 'loaded', 'unloading'], ['loaded', 'unloading']);

let state = new State('loading');

let otherState = new OtherState('loaded');

state.set(new OKState('all good'));

console.log(state.map(s => s));

try {
    state.set('unloading');
}
catch (ex) {
    console.log(ex);
}

try {
    state.set(new Error('error?'));
}
catch (ex) {
    console.log(ex);
}

try {
    class IllegalState extends StateType {}

    state.set(new IllegalState('illegal'));
}
catch (ex) {
    console.log(ex);
}

otherState.set('unloading');
console.log(otherState.map(s => s));

try {
    otherState.set('loading');
}
catch (ex) {
    console.log(ex);
}


/*
  store
  -----

LoggedOut
  routes: logout, login, home

LoggedIn
  token
  routes: report, home
*/

(function () {

const LoggedOutRoutes = defState('logout', 'login', 'home');
const LoggedInRoutes = defState('report', 'home').withDefault('home');

class LoggedOutState extends StateType {
    constructor(val) {
        super({ route: new LoggedOutRoutes( val.route ) })
    }
}
class LoggedInState extends StateType {
    constructor(val) {
        super({
            token: val.token,
            route: new LoggedInRoutes( val.route )
        });
    }
}


const Store = defState(LoggedOutState, LoggedInState);

function route(state) {
    return state.route.map(r => ({ route: r }));
}

let store = new Store(new LoggedOutState({ route: 'home'}));

console.log(store.map(s => s));

store.set(new LoggedInState({ token: 'DEADBEEF', route: 'report' }));

console.log(store.map(s => s));
console.log(store.map(route));

store.update({ route: 'home' });

console.log(store.map(s => s));
console.log(store.map(route));

store.update({ route: 'login' });
console.log(store.map(s => s));
console.log(store.map(route));  // goes to default 'home'

})();
