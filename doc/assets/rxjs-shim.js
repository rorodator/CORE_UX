/**
 * Enough of RxJS for the static filter-bar demo.
 * Application bundles use the real rxjs package.
 */

export class Observable {
    /**
     * @param {(subscriber: { next: Function, error: Function, complete: Function }) => unknown} subscribe
     */
    constructor(subscribe) {
        this._subscribe = subscribe;
    }

    /**
     * @param {((value: unknown) => void)|{ next?: Function, error?: Function, complete?: Function }} observer
     */
    subscribe(observer) {
        const sink = typeof observer === 'function'
            ? { next: observer, error() {}, complete() {} }
            : {
                next: observer?.next?.bind(observer) || (() => {}),
                error: observer?.error?.bind(observer) || (() => {}),
                complete: observer?.complete?.bind(observer) || (() => {}),
            };
        const teardown = this._subscribe(sink);
        return {
            unsubscribe() {
                if (typeof teardown === 'function') {
                    teardown();
                } else {
                    teardown?.unsubscribe?.();
                }
            },
        };
    }
}

export class Subject extends Observable {
    constructor() {
        const observers = new Set();
        super((observer) => {
            observers.add(observer);
            return () => observers.delete(observer);
        });
        this._observers = observers;
        this.closed = false;
    }

    /**
     * @param {unknown} value
     */
    next(value) {
        if (this.closed) {
            return;
        }
        for (const observer of [...this._observers]) {
            observer.next(value);
        }
    }

    complete() {
        if (this.closed) {
            return;
        }
        this.closed = true;
        for (const observer of [...this._observers]) {
            observer.complete();
        }
        this._observers.clear();
    }

    /**
     * @param {unknown} error
     */
    error(error) {
        if (this.closed) {
            return;
        }
        this.closed = true;
        for (const observer of [...this._observers]) {
            observer.error(error);
        }
        this._observers.clear();
    }
}

export class BehaviorSubject extends Subject {
    /**
     * @param {unknown} value
     */
    constructor(value) {
        super();
        this._value = value;
    }

    /**
     * @param {((value: unknown) => void)|{ next?: Function, error?: Function, complete?: Function }} observer
     */
    subscribe(observer) {
        const subscription = super.subscribe(observer);
        const next = typeof observer === 'function' ? observer : observer?.next?.bind(observer);
        next?.(this._value);
        return subscription;
    }

    /**
     * @param {unknown} value
     */
    next(value) {
        this._value = value;
        super.next(value);
    }
}
