import { Log } from 'ng2-logger';
import { RpcService } from '../rpc.service';


export class RpcStateClass {
  private log: any = Log.create('rpc-state.class');

  constructor(private _rpc: RpcService) {

    // Start polling...
    this._rpc.registerStateCall('getwalletinfo', 1000);
    this._rpc.registerStateCall('getblockchaininfo', 5000);
    this._rpc.registerStateCall('getnetworkinfo', 10000);
    this._rpc.registerStateCall('getstakinginfo', 10000);

    this.lastBlockTimeState();
    this.blockLoop();
    this.walletLockedState();
    this.coldStakeHook();
    this.initWalletState();
  }

  private lastBlockTimeState() {
    let _checkLastBlock = false;
    this._rpc.state.observe('mediantime').subscribe(
      mediantime => {
        const lastblocktime = new Date(mediantime * 1000);
        if (!_checkLastBlock && new Date().getTime() - (4 * 60 * 1000) > lastblocktime.getTime()) {
          setTimeout(() => {
            _checkLastBlock = false;
            this._rpc.stateCall('getblockchaininfo');
          }, 100);
          _checkLastBlock = true;
        }
      });
  }

  private blockLoop() {
    if (this._rpc.state.get('blocks') === 0) {
      setTimeout(this.blockLoop.bind(this), 1000);
    }
    this._rpc.stateCall('getblockchaininfo');
  }

  private walletLockedState() {
    this._rpc.state.observe('encryptionstatus')
    .subscribe(status => this._rpc.state
      .set('locked', ['Locked', 'Unlocked, staking only'].includes(status)));
  }

  /*
  * coldStakeHook
  *   Subscribes to general unlock events and makes use of the time to
  *   update the coldstaking state.
  */
  private coldStakeHook() {
    this._rpc.state.observe('locked').subscribe(
      locked => {
        if (locked === false) {
          // only available if unlocked
          this._rpc.call('walletsettings', ['changeaddress'])
          .subscribe(
            // set state for coldstaking
            response => this._rpc.state.set('ui:coldstaking',
              response.changeaddress === 'default' ? false : !!response.changeaddress.coldstakingaddress
              ),
            error => this.log.er('walletsettings changeaddress, returned an error', error));

        }
      });
  }

  private initWalletState() {

    this._rpc.state.observe('encryptionstatus').take(1)
    .subscribe(
      status => {
        const locked = this._rpc.state.get('locked');

        if (locked) {
          this._rpc.state.set('ui:walletInitialized', true);
          return;
        }

        this._rpc.call('extkey', ['list'])
        .subscribe(
          response => {
                // check if account is active
                if (response.result === 'No keys to list.') {
                  this._rpc.state.set('ui:walletInitialized', false);
                } else {
                  this._rpc.state.set('ui:walletInitialized', true);
                }
              },
              error => this.log.er('RPC Call returned an error', error));
      });
  }
}
