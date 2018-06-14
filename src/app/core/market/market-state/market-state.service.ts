import { Injectable, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';

import { Observable } from 'rxjs';

import { StateService } from 'app/core/state/state.service';
import { MarketService } from 'app/core/market/market.service';

@Injectable()
export class MarketStateService extends StateService implements OnDestroy {

  private log: any = Log.create('market-state.service');
  private destroyed: boolean = false;

  constructor(private market: MarketService) {
    super();
    this.log.d('MarketState: initialized');
    // fetch categories
    this.register('currencyprice', 30 * 1000, ['PART', 'USD']);
    this.register('category', 60 * 1000, ['list']);
    this.register('profile', 60 * 1000, ['list']);
    this.register('bid', 60 * 1000, ['search', '*', '*', 'ASC'])
  }

  /** Register a state call, executes every X seconds (timeout) */
  register(method: string, timeout: number, params?: Array<any> | null): void {
    // Keep track of errors, and poll accordingly
    let errors = 0;

    // loop procedure
    const _call = () => {
      if (this.destroyed) {
        // RpcState service has been destroyed, stop.
        return;
      }
      this.market.call(method, params)
        .finally(() => {
          // re-start loop
          if (timeout) {
            const restartAfter = this.determineTimeoutDuration(errors, timeout);
            setTimeout(_call, restartAfter);
          }
        })
        .subscribe(
        success => {
          this.set(method, success);
          errors = 0;
        },
        error => {
          this.log.er(`register(): Market RPC Call ${method} returned an error:`, error);
          errors++;
        });
    };

    // initiate loop
    _call();
  }

  determineTimeoutDuration(errors: number, timeout: number): number {
    let restartAfter: number = timeout;

    // if error occurred
    if (errors > 0) {
      if (errors < 30) {
        // might be booting up, let's retry after 1s
        restartAfter = 1000;
      } else {
        // wait 10 seconds or timeout duration
        // whichever is the longest.
        restartAfter = timeout > 10000 ? timeout : 10000;
      }
      // if no error occured
      // just use normal timeout
    } else {
      restartAfter = timeout;
    }
    return restartAfter;
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

}
