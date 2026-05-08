export function createStore(initialState, render) {
    let state = initialState;

    function setState(update) {
        // Tiny reactive core: all state changes flow through here, then render reconciles the DOM.
        state = typeof update === 'function'
            ? update(state)
            : { ...state, ...update };

        render(state);
    }

    return {
        getState() {
            return state;
        },
        setState
    };
}
