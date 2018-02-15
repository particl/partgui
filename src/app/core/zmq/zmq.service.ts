import { Injectable } from '@angular/core';
import { Log } from 'ng2-logger'
import { Observable } from 'rxjs/Observable';

import { IpcService } from '../ipc/ipc.service';

@Injectable()
export class ZmqService {

  log: any = Log.create('zmq.service');

  constructor(private _ipc: IpcService) {
    this.log.d('Registering ipc listener');
    if (this._ipc.isIpcAvailable()) {
      // Register a listener on the channel "zmq" (ipc)
      this._ipc.registerListener('zmq', this.zmqListener.bind(this));
    }
   }

  /*
   This is called every incomming message on ZMQ channel.
   node -> GUI (and reply back)
  */
   zmqListener(...args: any[]): Observable<any> {
    return Observable.create(observer => {
        this.log.d('ZMQ pushed a new message, yay! data: ' + args);
        observer.next('Thanks ZMQ, here is some data back you good ol\' friend');
        observer.complete();
      });
  }
}
