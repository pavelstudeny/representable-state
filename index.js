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

        is(val) {
            if (this._state instanceof StateType) {
                return this._state instanceof val;
            }
            return this._state === val;
        }

        enum() {
            return enums.find(e => {
                return e === this._state || (e.prototype instanceof StateType && this._state instanceof e)
            });
        }

        set(val) {
            return getType(val)
                .then(type => {
                    if (this._transitions) {
                        if (typeof this._state === 'undefined') {
                            if (!this._transitions.some(transitionArray => transitionArray[0] === type)) {
                                if (!this._default) {
                                    throw new Error('Illegal transition: ' + typeName(this._state) + ' -> ' + typeName(val));
                                }
                                return this.set(this._default);
                            }
                        }
                        else {
                            const currentType = getType(this._state).get();
                            if (!this._transitions.some(transitionArray => transitionArray.slice(1).some((t, i) => t === type && currentType === transitionArray[i]))) {
                                if (!this._default) {
                                    throw new Error('Illegal transition: ' + typeName(this._state) + ' -> ' + typeName(val));
                                }
                                return this.set(this._default);
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

module.exports = { StateType, defState };

