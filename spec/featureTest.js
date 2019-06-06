const { StateType, defState } = require('../index.js');

describe('RState', function () {
    it('works with plain values', function () {
        const State = defState('loading', 'loaded', 'unloading')

        let state = new State('loading');
        state.set('loaded');

        expect(state.map(x => x)).toBe('loaded');
    });

    it('works with a combinantion of plain values and StateTypes (enums with a value)', function () {
        class OKState extends StateType {}
        class ErrorState extends StateType {}
        
        const State = defState('loading', OKState, ErrorState);

        let state = new State('loading');
        state.set(new OKState('all good'));

        expect(state.map(x => x)).toBe('all good');
    });

    it('does not interfere with states of another RState', function () {
        const State = defState('loading', 'loaded');
        const OtherState = defState('loading', 'complete');

        let state = new State('loading');
        let otherState = new OtherState('loading');

        state.set('loaded');
        expect(state.map(x => x)).toBe('loaded');

        expect(function () { otherState.set('loaded') }).toThrow();
    });

    it('rejects invalid values', function () {
        class OKState extends StateType {}

        const State = defState('loading', OKState)

        let state = new State('loading');

        expect(function () { state.set(new Error('loading failed')) }).toThrow();
    });

    it('rejects invalid StateType values', function () {
        class OKState extends StateType {}
        class ErrorState extends StateType {}

        const State = defState('loading', OKState)

        let state = new State('loading');

        expect(function () { state.set(new ErrorState('loading failed')) }).toThrow();
    });

    describe('transitions', function () {
        it('reject a valid value if such a transition is invalid', function () {
            const State = defState('loading', 'loaded', 'unloading').transitions(['loading', 'loaded', 'unloading'], ['loaded', 'unloading']);

            let state = new State('loaded');

            expect(function () { state.set('unloading') }).not.toThrow();
            expect(state.map(x => x)).toBe('unloading');

            expect(function () { state.set('loading') }).toThrow();
        });
    })
});
