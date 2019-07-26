const EventEmitter = require('events');
const Optional = require('optional-js');

class StateType {
  constructor(value) {
    this._value = value;
  }
  value() {
    return this._value;
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
      return e === val || (e.prototype instanceof StateType && val instanceof e);
    });

    if (typeIdx == -1) {
      return Optional.empty();
    }
    else {
      return Optional.of(enums[typeIdx]);
    }
  }

  class RState {
    constructor(val_or_func) {
      this.set(val_or_func);
    }

    when(val, f) {
      if (arguments.length != 2 && arguments.length != 1) {
        throw new Error('Invalid arguments: ' + Array.prototype.join.call(arguments, ', '));
      }
      if (!this.is(val)) {
        return this;
      }
      const stateValue = this._state instanceof StateType ? this._state.value() : this._state;
      const value = f ? f(stateValue) : stateValue;
      return Object.assign({}, this, {
        when: function () {
          return this;
        },
        collect: function () {
          return value;
        }
      });
    }

    collect(defaultValue) {
      return defaultValue;
    }

    is(val) {
      if (this._state instanceof StateType) {
        return this._state instanceof val;
      }
      return this._state === val;
    }

    get() {
      return enums.find(e => {
        return e === this._state || (e.prototype instanceof StateType && this._state instanceof e);
      });
    }

    allowed(val) {
      return getType(val)
        .filter(type => {
          if (typeof this._state === 'undefined' && this._transitions && this._transitions.initial) {
            if (this._transitions.initial.indexOf(type) == -1) {
              return false;
            }
          }
          if (typeof this._state !== 'undefined' && this._transitions && this._transitions.map) {
            let currentType = getType(this._state).get();
            if (typeof currentType !== 'function') {
              currentType = currentType.toString();
            }
            else {
              currentType = currentType.name;
            }

            if (!this._transitions.map[currentType] || this._transitions.map[currentType].indexOf(type) == -1) {
              return false;
            }
          }

          return true;
        })
        .isPresent();
    }

    set(val) {
      return getType(val)
        .ifPresentOrElse(type => {
          if (typeof this._state === 'undefined' && this._transitions && this._transitions.initial) {
            if (this._transitions.initial.indexOf(type) == -1) {
              if (!this._default || val === this._default) {
                throw new Error('Illegal transition: ' + typeName(this._state) + ' -> ' + typeName(val));
              }
              return this.set(this._default);
            }
          }
          if (typeof this._state !== 'undefined' && this._transitions && this._transitions.map) {
            let currentType = getType(this._state).get();
            if (typeof currentType !== 'function') {
              currentType = currentType.toString();
            }
            else {
              currentType = currentType.name;
            }

            if (!this._transitions.map[currentType] || this._transitions.map[currentType].indexOf(type) == -1) {
              if (!this._default || val === this._default) {
                throw new Error('Illegal transition: ' + typeName(this._state) + ' -> ' + typeName(val));
              }
              return this.set(this._default);
            }
          }

          this._state = val;
          return this;
        },
        () => {
          if (!this._default) {
            throw new Error('Illegal argument: ' + typeName(val));
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

    static transitions(transition_map, initial_array) {
      this.prototype._transitions = { initial: initial_array, map: transition_map };
      return this;
    }

    static withDefault(defaultValue) {
      this.prototype._default = defaultValue;
      return this;
    }

    static create(initialValue) {
      return new this(initialValue);
    }
  }
  return RState;
}

function intersectState(statesMap) {
  class StateIntersection extends EventEmitter {
    constructor(statesMap) {
      super();
      this._states = Object.assign({}, statesMap);
      this._first = Object.keys(statesMap)[0];
    }

    get () {
      return this._states[this._first].get();
    }

    allowed (value) {
      for (let key in this._states) {
        if (!this._states[key].allowed(value)) {
          return false;
        }
      }
      return true;
    }

    set (value) {
      const maxAttempts = Object.keys(this._states).length + 1;
      let val = value;
      let change = false;
      for (let i = 0; i < maxAttempts; ++i) {
        for (let key in this._states) {
          this._states[key].set(val);
          if (!this._states[key].is(val)) {
            val = this._states[key].when(this._states[key].get()).collect();
            change = true;
            break;
          }
        }

        if (!change) {
          this.emit('change', val);
          return this;
        }

        change = false;
      }

      if (typeof this._default === 'undefined') {
        throw new Error('Mutually acceptable state does not exist for ' + JSON.stringify(value, 2, null));
      }

      for (let key in this._states) {
        this._states[key].set(this._default);
        if (!this._states[key].is(this._default)) {
          throw new Error('Default invalid for ' + key);
        }
      }

      this.emit('change', this._default);
      return this;
    }

    reset (rstate, opt_value) {
      // assert Object.keys(value).length == 1
      const key = Object.keys(rstate)[0];
      const currentValue = arguments.length > 1 ? opt_value : this._states[key].when(this._states[key].get()).collect();
      this._states[key] = rstate[key];
      return this.set(currentValue);
    }

    subscribe (callback) {
      this.addListener('change', callback);
      return () => this.removeListener('change', callback);
    }

    static withDefault(defaultValue) {
      this.prototype._default = defaultValue;
      return this;
    }

    static create(newValue) {
      if (arguments.length == 0) {
        const [ first, ...rest ] = Object.keys(statesMap);
        rest.forEach(r => {
          if (!statesMap[r].is(statesMap[first].get())) {
            throw new Error('inconsistent initial state');
          }
        });
      }

      let instance = new this(statesMap);

      if (arguments.length != 0) {
        instance.set(newValue);
      }

      return instance;
    }
  };

  return StateIntersection;
}

module.exports = { StateType, defState, intersectState };

