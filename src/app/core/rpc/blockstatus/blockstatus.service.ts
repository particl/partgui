import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { Log } from 'ng2-logger';

import { RpcStateService } from '../rpc-state/rpc-state.service';
import { PeerService } from '../peer/peer.service';

@Injectable()
export class BlockStatusService {

  private log: any = Log.create('blockstatus.service id:' + Math.floor((Math.random() * 1000) + 1));

  /* Block variables */
  private highestBlockHeightNetwork: number = -1;
  private highestBlockHeightInternal: number = -1;
  private startingBlockCount: number = -1;
  private totalRemainder: number = -1;

  /* Last time we had a change in block count */
  private lastUpdateTime: number; // used to calculate the estimatedTimeLeft

  /* The last five hundred estimatedTimeLeft results, averaging this out for stable result */
  private arrayLastEstimatedTimeLefts: Array<number> = [];
  private amountToAverage: number = 100;

  public statusUpdates: Subject<any> = new Subject<any>();

  private status: any = {
    syncPercentage: 0,
    remainingBlocks: undefined,
    lastBlockTime: undefined,
    increasePerMinute: 0,
    estimatedTimeLeft: undefined,
    manuallyOpened: false,
    networkBH: -1,
    internalBH: -1
  };

  constructor(
    private _peerService: PeerService,
    private _rpcState: RpcStateService
  ) {
    // Get internal block height and calculate syncing details (ETA)
    this.log.d('constructor blockstatus');
    // this._state.observe('blocks')
    this._peerService.getBlockCount()
      .subscribe(
        height => {
          this.log.d('getBlockCount(): triggered');
          this.calculateSyncingDetails(height);

          // must be after calculateSyncingDetails
          if (this.highestBlockHeightInternal < height) {
            this.lastUpdateTime = Date.now();
          }

          this.highestBlockHeightInternal = height;
          this.status.internalBH = height;

          if (this.startingBlockCount === -1) {
            this.startingBlockCount = height;
          }
        },
        error => console.log('constructor blockstatus: state blocks subscription error:' + error));

    // Get heighest block count of peers and calculate remainerders.
    this._peerService.getBlockCountNetwork()
      .subscribe(
        height => {
          this.log.d(`getBlockCountNetwork(): new height ${height}`);
          this.highestBlockHeightNetwork = height;
          this.status.networkBH = height;
          if (this.totalRemainder === -1 && this.startingBlockCount !== -1) {
            this.totalRemainder = height - this.startingBlockCount;
          }
        },
        error => this.log.error('constructor blockstatus: getBlockCountNetwork() subscription error:' + error));

    this._rpcState.observe('getblockchaininfo', 'mediantime')
      .subscribe(
        (mediantime: number) => this.status.lastBlockTime = new Date(mediantime * 1000)
    );
  }


  /** Calculates the details (percentage of synchronised, estimated time left, ..) */
  private calculateSyncingDetails(newHeight: number) {

    const internalBH = this.highestBlockHeightInternal;
    const networkBH = this.highestBlockHeightNetwork;

    if (internalBH < 0 || networkBH < 0) {
      this.status.syncPercentage = 0;
      return;
    }

    // remainingBlocks
    this.status.remainingBlocks = networkBH - internalBH;

    // syncPercentage
    this.status.syncPercentage = internalBH / networkBH * 100;
    if (this.status.syncPercentage > 100) {
      this.status.syncPercentage = 100;
    }

    /*
      Time & block diff between updates.
      "how much blocks did it sync since last time we ran this function"
    */
    const timeDiff: number = Date.now() - this.lastUpdateTime; // in milliseconds
    const blockDiff: number = newHeight - internalBH;

    // increasePerMinute
    if (timeDiff > 0 && this.totalRemainder > 0) {
      const increasePerMinute = blockDiff / this.totalRemainder * 100 * (60 * 1000 / timeDiff);
      if (increasePerMinute < 100) {
        this.status.increasePerMinute = +increasePerMinute.toFixed(2);
      } else {
        this.status.increasePerMinute = 100;
      }
    }

    // timeLeft
    if (blockDiff > 0) {
      this.estimateTimeLeft(blockDiff, timeDiff);
    }

    // updates for modal
    this.statusUpdates.next(this.status);
  }

  /** Returns how many blocks remain to be synced. */
  private getRemainder() {
    const diff = this.highestBlockHeightNetwork - this.highestBlockHeightInternal;
    return (diff < 0 ? 0 : diff);
  }

  /** Calculates how much time is left to be fully synchronised. */
  private estimateTimeLeft(blockDiff: number, timeDiff: number) {

    let returnString = '';

    const secs = this.exponentialMovingAverageTimeLeft(Math.floor((this.getRemainder() / blockDiff * timeDiff) / 1000)),
          seconds = Math.floor(secs % 60),
          minutes = Math.floor((secs / 60) % 60),
          hours = Math.floor((secs / 3600) % 3600);

    if (hours > 0) {
      returnString += `${hours} ${hours > 1 ? 'hours' : 'hour'} `
    }
    if (minutes > 0) {
      returnString += `${minutes} ${minutes > 1 ? 'minutes' : 'minute'} `
    } else if (hours === 0 && seconds > 0) {
      returnString += `Any minute now!`;
    }
    /*
    if (seconds > 0) {
      returnString += `${seconds} ${seconds > 1 ? 'seconds' : 'second'}`
    }*/
    if (returnString === '') {
      returnString = '∞';
    }

    this.status.estimatedTimeLeft = returnString;
  }

  /** Inserts estimatedTimeLeft into private array and returns an exponential moving average result to create more consistent result. */
  private exponentialMovingAverageTimeLeft(estimatedTimeLeft: number): number {

    /* add element to averaging array */
    const length = this.arrayLastEstimatedTimeLefts.push(estimatedTimeLeft);

    /* if length > allowed length, pop first element */
    if (length > this.amountToAverage) {
      this.arrayLastEstimatedTimeLefts.shift();
    }

    // smooth factor k = 2 / (N -1) where N > 1
    const k = 2 / (length - ( length > 1 ? 1 : 0))

    let EMA = 0;
    // EMA = array[i] * K + EMA(previous) * (1 - K)
    this.arrayLastEstimatedTimeLefts.forEach((time, i) => {
      EMA = time * k + EMA * (1 - k);
    });

    const averageEstimatedTimeLeft = Math.floor(EMA);

    this.log.d(`exponentialMovingAverageTimeLeft(): length=${length} averageInSec=${Math.floor(averageEstimatedTimeLeft)}`);
    return averageEstimatedTimeLeft;
  }

}
