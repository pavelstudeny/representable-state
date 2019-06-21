const { StateType, defState } = require('../index.js');

describe('RState', function () {
    it('works with plain values', function () {
        const State = defState('loading', 'loaded', 'unloading')

        let state = new State('loading');
        state.set('loaded');

        expect(state.get()).toBe('loaded');
    });

    it('collects the selected value', function () {
        const State = defState('loading', 'loaded', 'unloading')

        let state = new State('loaded');
        const collector = state
          .on('loading', function () { fail('loading visitor should not have been called'); })
          .on('loaded', x => 'visited')
          .on('unloading', function () { fail('unloading visitor should not have been called'); })


        expect(collector.collect()).toBe('visited');
    });

    it('creates instance', function () {
        let state = defState('a', 'b', 3).withDefault(3).create();
        expect(state.is(3)).toBe(true);
    });

    it('collects the default value if nothing is selected', function () {
        const State = defState('loading', 'loaded', 'unloading')

        let state = new State('loaded');

        expect(state.collect('predef')).toBe('predef');

        expect(state
          .on('loading', function () { fail('loading visitor should not have been called'); })
          .on('unloading', function () { fail('unloading visitor should not have been called'); })
          .collect('postdef')
        ).toBe('postdef');
    });

    it('works with a combinantion of plain values and StateTypes (enums with a value)', function () {
        class OKState extends StateType {}
        class ErrorState extends StateType {}
        
        const State = defState('loading', OKState, ErrorState);

        let state = new State('loading');
        state.set(new OKState('all good'));

        expect(state.get()).toBe(OKState);
    });

    it('does not interfere with states of another RState', function () {
        const State = defState('loading', 'loaded');
        const OtherState = defState('loading', 'complete');

        let state = new State('loading');
        let otherState = new OtherState('loading');

        state.set('loaded');
        expect(state.get()).toBe('loaded');

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

    it('compares value', function () {
        class OKState extends StateType {}
        class ErrorState extends StateType {}
        class ExceptionState extends StateType {}
        class RandomClass {}

        const State = defState('loading', OKState, ErrorState);

        let state = new State('loading');

        expect(state.is('loading')).toBe(true);

        state.set(new OKState('ok'));

        expect(state.is(OKState)).toBe(true);
        expect(state.is(ErrorState)).toBe(false);
        expect(state.is(ExceptionState)).toBe(false);
        expect(state.is(RandomClass)).toBe(false);
    });

    it('can be passed to a switch statement', function () {
        class OKState extends StateType {}
        class ErrorState extends StateType {}

        const State = defState('loading', OKState, ErrorState, 1);

        state = new State(new OKState('ok'));

        switch (state.get()) {
            case 'loading': fail('value should be OKState'); break;
            case OKState: break;
            case ErrorState: fail('value should be OKState'); break;
            default: fail('value should be OKState'); break;
        }

        state.set(1);
        switch (state.get()) {
            case 1: break;
            default: fail('value should be OKState'); break;
        }
    })


    describe('transitions', function () {
        it('reject a valid value if such a transition is invalid', function () {
            const State = defState('loading', 'loaded', 'unloading').transitions({
                'loading': [ 'loaded' ],
                'loaded': [ 'unloading' ]
            });

            let state = new State('loaded');

            expect(function () { state.set('unloading') }).not.toThrow();
            expect(state.is('unloading')).toBe(true);

            expect(function () { state.set('loading') }).toThrow();
        });

        it('work for StateTypes', function () {
            class OKState extends StateType {}
            class ErrorState extends StateType {}
            class ExceptionState extends StateType {}
    
            const State = defState(OKState, ErrorState, ExceptionState).transitions({
                OKState: [ ErrorState, ExceptionState ],
                ErrorState: [ OKState, ExceptionState ]
            });

            let state = new State(new OKState(200));

            expect(function () {
                state.set(new ExceptionState(new Error('unrecoverable error')));
            }).not.toThrow();
            expect(state.on(ExceptionState, x => x.message).collect()).toBe('unrecoverable error');

            expect(function () {
                state.set(new ErrorState(500));
            }).toThrow();
            expect(state.is(ExceptionState));
        });

        it('work for numbers', function () {
            const State = defState(1, 2, 3).transitions({
                1: [ 2, 3 ],
                2: [ 1, 3 ]
            });

            let state = new State(1);

            expect(function () {
                state.set(3);
            }).not.toThrow();
            expect(state.get()).toBe(3);

            expect(function () {
                state.set(2);
            }).toThrow();
            expect(state.is(3));
        });

        it('reject invalid initial state', function () {
            const State = defState(1, 2, 3).transitions({
                1: [ 2, 3 ]
            }, [ 1, 2 ]).withDefault(1);

            let state = new State(3);

            expect(state.is(1));
        });

        it('throw on an invalid transition to the default state', function () {
            const State = defState(1, 2, 3).transitions({
                1: [ 2, 3 ]
            }, [ 2 ]).withDefault(1);

            expect(function () {
                new State(3);
            }).toThrow();
        });
    })
});
