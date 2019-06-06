const { StateType, defState } = require('../index.js');

/*
  store
  -----

LoggedOut
  routes: logout, login, home

LoggedIn
  token
  routes: report, home
*/

describe('nested RState', function () {
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
        return state.route.map(r => r);
    }
    

    it('StateType may contain an RState as a value', function () {
        let store = new Store(new LoggedOutState({ route: 'home'}));

        expect(store.map(x => x)).toEqual({ route: jasmine.objectContaining({}) });
        expect(store.map(x => x)).toEqual({ route: jasmine.objectContaining({}) });

        expect(store.map(route)).toBe('home');
    });

    it('switches between valid values', function () {
        let store = new Store(new LoggedOutState({ route: 'home'}));

        store.set(new LoggedInState({ token: 'DEADBEEF', route: 'report' }));

        expect(store.map(s => s.token)).toBe('DEADBEEF');
        expect(store.map(route)).toBe('report');
    });

    it('updates partial values', function () {
        let store = new Store(new LoggedInState({ token: 'DEADBEEF', route: 'report'}));

        store.update({ route: 'home' });

        expect(store.map(s => s.token)).toBe('DEADBEEF');
        expect(store.map(route)).toBe('home');
    });

    it('moves to the default value instead of throwing an exception', function () {
        let store = new Store(new LoggedInState({ token: 'DEADBEEF', route: 'report'}));

        store.update({ route: 'login' });

        expect(store.map(s => s.token)).toBe('DEADBEEF');
        expect(store.map(route)).toBe('home');
    });
});
