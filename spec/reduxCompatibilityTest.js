var Redux = require('redux');
const { StateType, defState } = require('../index.js');


describe('representable-state with Redux', function () {
    const LoggedOutRoutes = defState('logout', 'login', 'home').withDefault('login');
    const LoggedInRoutes = defState('report', 'home').withDefault('home');
    
    class LoggedOutState extends StateType {
        constructor(val) {
            super({ route: new LoggedOutRoutes( val ? val.route : undefined ) })
        }
    }
    class LoggedInState extends StateType {
        constructor(val) {
            super({
                token: val.token,
                route: new LoggedInRoutes( val ? val.route : undefined )
            });
        }
    }

    function route(state) {
        return state.route.map(r => r);
    }

    it('creates store', function () {
        const State = defState(LoggedOutState, LoggedInState);

        let store = Redux.createStore(function (state, action) { 
            if (action.type === 'navigate') {
                return state.update({ route: action.route });
            }
            return state;
        }, new State(new LoggedOutState()));

        expect(store.getState().map(route)).toBe('login');
    });

    it('reduces actions', function () {
        const State = defState(LoggedOutState, LoggedInState);

        let store = Redux.createStore(function (state, action) { 
            if (action.type === 'navigate') {
                return state.update({ route: action.route });
            }
            return state;
        }, new State(new LoggedOutState()));

        store.dispatch({
            type: 'navigate',
            route: 'home'
        });

        expect(store.getState().map(route)).toBe('home');
    });

    it('reduces invalid actions to defaults', function () {
        const State = defState(LoggedOutState, LoggedInState);

        let store = Redux.createStore(function (state, action) { 
            if (action.type === 'navigate') {
                return state.update({ route: action.route });
            }
            return state;
        }, new State(new LoggedOutState()));

        store.dispatch({
            type: 'navigate',
            route: 'home'
        });
        store.dispatch({
            type: 'navigate',
            route: 'report'  // invalid
        });

        expect(store.getState().map(route)).toBe('login');
    });

    it('is reactive', function () {
        const State = defState(LoggedOutState, LoggedInState);

        let store = Redux.createStore(function (state, action) { 
            if (action.type === 'navigate') {
                return state.update({ route: action.route });
            }
            return state;
        }, new State(new LoggedOutState()));

        let handleChange = jasmine.createSpy('handleChange').and.callFake(function () {
            expect(store.getState().map(route)).toBe('home');
        });

        store.subscribe(handleChange);

        store.dispatch({
            type: 'navigate',
            route: 'home'
        });

        expect(handleChange).toHaveBeenCalled();
    });
});
