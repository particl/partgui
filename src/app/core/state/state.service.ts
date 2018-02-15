import { Injectable } from '@angular/core';

import { Observable } from 'rxjs/Rx';
import { Observer } from 'rxjs/Rx';


export interface InternalStateType {
  [key: string]: any;
};

interface InternalStateCache {
  [key: string]: {
    observer: Observer<InternalStateType>,
    observable: Observable<any>
  }
}

@Injectable()
export class StateService {
  private _state: InternalStateType = { };

  private _observerPairs: InternalStateCache = {};

  constructor() { }

  /** return a clone of the current state */
  get state() {
    return this._state = this._clone(this._state);
  }

  /** never allow mutation */
  set state(value: any) {
    throw new Error('do not mutate the `.state` directly');
  }

  get(prop?: any) {
    // use our state getter for the clone
    const state = this.state;

    return state.hasOwnProperty(prop) ? state[prop] : undefined;
  }

  set(prop: string, value: any) {
    const updated = this._state[prop] !== value;
    const state = this._state[prop] = value; // internally mutate our state

    if (updated && this._getObservablePair(prop).observer) {
      this._getObservablePair(prop)
        .observer.next(value);
    }

    return state;
  }

  observe(prop: string, subkey?: string) {
    let observable = this._getObservablePair(prop).observable;
    if (subkey) {
      // TODO: maybe check if subkey exists?
      // e.g observe('getblockchaininfo', 'blocks') will return only the 'blocks' key from the output.
      observable = observable.map(key => key[subkey]);
    }
    return observable.distinctUntilChanged();
  }


  private _clone(object: InternalStateType) {
    // simple object clone
    return JSON.parse(JSON.stringify(object));
  }

  private _getObservablePair(prop: string)  {
    if (!this._observerPairs[prop]) {
      this._observerPairs[prop] = {
        observable: null,
        observer: null
      };

      this._observerPairs[prop].observable = Observable.create(
          _observer => this._observerPairs[prop].observer = _observer
      ).shareReplay(1);
    }

    return this._observerPairs[prop];
  }

}
