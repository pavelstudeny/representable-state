DRAFT: Make Illegal States Unrepresentable
==========================================

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

Open questions:

* should it be possible for the plain enum to be an object?
   * probably not - what would happen if a property of the object is modified?
* is StateType necessary?
   * A nested RState could be used directly, but that would require an option for an arbitrary value (such as a username), which is what RState aims to prevent

What should happen when an incorrect value is set? Typed languages would prohibit such thing in compile time.
RState detects this in runtime. In such cases, it throws an exception that the calling layer needs to handle.
This might be beneficial in come cases, but often it can be a burden. This is solved by an optional
default value to switch (and no exception is thrown).

Open questions:

* do we want an option not to throw and stay silently at the last valid value?

In cases like finite automatons, a transition from a valid state to another valid state may be invalid.
Transition validity may be solved by an optional list of transitions from a value to other values.

Open questions:

* does anybody want that?

Implementation
--------------

Except for update recursion, StateType just stores a value passed to constructor and provides it back via a `map`
method ( `const value = StateType.map(function (v) { return v; })` ).

Open questions:

* do we want a simple `get()` method in addition to _map_ or even remove _map_ and provide just _get_?

RState is a class defined inside a `defState(...)` function scope, so that the straight values and StateType
subtypes are kept in the function's closure. When a value is set, RState checks that it is either
one of the straight values or a StateType instance.

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
```


Other goals
-----------

Should be usable with Redux / Vuex / ....
