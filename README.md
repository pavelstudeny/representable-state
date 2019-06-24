Make Illegal States Unrepresentable in JavaScript
=================================================

Set and get your state safely, with declarative constraints
-----------------------------------------------------------

Some languages provide support for unions or enums with a value,
that allow to always represent a state consistently.

This is a playground to achieve something similar in JavaScript.

Design
------

A Representable State (RState) class should be only settable to one of pre-defined
states that are, as much as possible, close to enums with optional enum values.
Plain enums are represented by arbitrary constants, such as strings or numbers,
while enums with values are represented by a special class, StateType,
that holds a value.

What should happen when an incorrect value is set? Typed languages would prohibit such thing in compile time.
RState detects this in runtime. In such cases, it throws an exception that the calling layer needs to handle.
This might be beneficial in come cases, but often it can be a burden. This is solved by an optional
default value to switch (and no exception is thrown).

In cases like finite automatons, a transition from a valid state to another valid state may be invalid.
Transition validity may be solved by an optional list of transitions from a value to other values.

**Open questions**:

* does anybody want that?

API
---

RState is a class defined inside a `defState(...)` function scope.

**`get`** returns the current _state_

**`is`** checks whether RState is in a desired _state_

**`when`** calls a callback if RState is in a desired _state_ and passes the state _value_ to the callback

**`collect`** returns the value returned by `when` callback

**`set`** changes the current _state_

**`update`** updates the current _state_ _value_


Except for update recursion, StateType just stores a value passed to constructor and provides it back via a `value()`.


Examples
--------

```
const ReadyState = defState('unloaded', 'loading', 'complete');
let readyState = new ReadyState('unloaded');
...
readyState.set('loading');
readyState.set('void');  // this throws an error
```

```
class HttpOk extends StateType {}
class HttpRedirect extends StateType {}
class HttpError extends StateType {}

const HttpStatus = defState(HttpOk, HttpRedirect, HttpError);
...
let httpResult = new HttpStatus(new HttpRedirect({ code: 303, redirectUrl = 'http://see.other.com' }));
...

function httpStatusCode(v) { return v.code }

const resultCode = httpResult
    .when(HttpOk, httpStatusCode)        // success status
    .when(HttpRedirect, httpStatusCode)  // redirect status
    .collect('error');                   // 'error' is the default if none of the whens triggered

console.log('Result:', resultCode);

if (httpResult.is(HttpRedirect)) {
    startRedirect( httpResult.map(x => x.redirectUrl) );
}
```

Multiple constraints
--------------------

Let's assume a case where you are allowed to view certain sets of pages based on:

* whether you have an active subscription
* whether you have any friends

in an imaginary chat app. The enum-value concept does not help here.

`intersectState` allows multiple RState instances to sync on _states_ they have in common.

Example
-------

```
const unsubscribedRoutes = defState('subscribe', 'profile').create();
const subscribedRoutes   = defState('friends', 'chat', 'profile').create();

const friendsRoutes      = defState('subscribe', 'profile', 'chat', 'friends').create();
const noFriendsRoutes    = defState('subscribe', 'profile').create();

const validRoutes = intersectState({
   subscription: subscribed ? subscribedRoutes : unsubscribedRoutes,
   friends: friends.count() > 0 ? friendsRoutes : noFriendsRoutes
}).create('profile');

validRoutes.subscribe(state => console.log('Navigated to:', state));

unsubscribedRoutes.set('subscribe');
...
validRoutes.reset({ subscription: subscribedRoutes });
```

Other features
-----------

Usable with Redux / Vuex / ....
