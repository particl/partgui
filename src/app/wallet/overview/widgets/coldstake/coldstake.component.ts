import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { ModalsService } from 'app/modals/modals.service';
import { RpcService } from 'app/core/rpc/rpc.module';

import { Amount } from '../../../shared/util/utils';
import { ZapColdstakingComponent } from './zap-coldstaking/zap-coldstaking.component';
import { RevertColdstakingComponent } from './revert-coldstaking/revert-coldstaking.component';

@Component({
  selector: 'app-coldstake',
  templateUrl: './coldstake.component.html',
  styleUrls: ['./coldstake.component.scss']
})
export class ColdstakeComponent implements OnDestroy {

  private log: any = Log.create('coldstake.component');
  private destroyed: boolean = false;

  coldStakingEnabled: boolean = undefined;
  public encryptionStatus: string = 'Locked';

  private progress: Amount = new Amount(0, 2);
  get coldstakeProgress(): number { return this.progress.getAmount() }


  hotstakingamount: number = 0.0;
  coldstakingamount: number = 0.0;

  constructor(
    private dialog: MatDialog,
    private _modals: ModalsService,
    private _rpc: RpcService
  ) {
    this._rpc.state.observe('encryptionstatus')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.encryptionStatus = status);

    this._rpc.state.observe('ui:coldstaking')
      .takeWhile(() => !this.destroyed)
      .subscribe(status => this.coldStakingEnabled = status);

    this._rpc.state.observe('blocks')
      .takeWhile(() => !this.destroyed).throttle(val => Observable.interval(10000/*ms*/))
      .subscribe(block => this.rpc_progress());
    // TODO: move to coldstaking service

    this.rpc_progress();
  }

  private rpc_progress(): void {
    // TODO: not necessary when cold staking disabled
    this.stakingStatus();
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  private stakingStatus() {
    this._rpc.call('getcoldstakinginfo').subscribe(coldstakinginfo => {
      this.log.d('stakingStatus called ' + coldstakinginfo['enabled']);
      this.progress = new Amount(coldstakinginfo['percent_in_coldstakeable_script'], 2);
      this.coldstakingamount = coldstakinginfo['percent_in_coldstakeable_script'];
      this.hotstakingamount = coldstakinginfo['coin_in_stakeable_script'];

      this.log.d(`coldstakingamount (actually a percentage) ${this.coldstakingamount}`);
      this.log.d(`hotstakingamount ${this.hotstakingamount}`);

      if ('enabled' in coldstakinginfo) {
        this._rpc.state.set('ui:coldstaking', coldstakinginfo['enabled']);
      } else { // ( < 0.15.1.2) enabled = undefined ( => false)
        this._rpc.state.set('ui:coldstaking', false);
      }

    }, error => this.log.er('couldn\'t get coldstakinginfo', error));
  }

  zap() {
    if (this._rpc.state.get('locked')) {
      this._modals.open('unlock', {
        forceOpen: true,
        callback: this.openZapColdstakingModal.bind(this)
      });
    } else {
      this.openZapColdstakingModal();
    }
  }

  openRevertColdstakingModal() {
    const dialogRef = this.dialog.open(RevertColdstakingComponent);
    // update progress after closing the dialog
    dialogRef.afterClosed().subscribe(result => this.rpc_progress());
  }

  revert() {
    if (this._rpc.state.get('locked')) {
      this._modals.open('unlock', {
        forceOpen: true,
        callback: this.openRevertColdstakingModal.bind(this)
      });
    } else {
      this.openRevertColdstakingModal();
    }
  }

  openZapColdstakingModal(): void {
    const dialogRef = this.dialog.open(ZapColdstakingComponent);

    // update progress after closing the dialog
    dialogRef.afterClosed().subscribe(result => this.rpc_progress());
  }

  openUnlockWalletModal(): void {
    this._modals.open('unlock', { forceOpen: true, showStakeOnly: false, stakeOnly: true });
  }

  openColdStakeModal(): void {
    this._modals.open('coldStake', { forceOpen: true, type: 'cold' });
  }

  checkLockStatus(): boolean {
    return [
      'Unlocked',
      'Unlocked, staking only',
      'Unencrypted'
    ].includes(this.encryptionStatus);
  }
}
