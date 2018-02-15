import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Log } from 'ng2-logger'

import { IpcListener, ObservableFactoryFunction, Receiver, ListenerEvent } from './ipc.types';

// RxIPC related stuffs

@Injectable()
export class IpcService {

  log: any = Log.create('ipc.service');

  /* Listeners on the renderer */
  private listenerCount: number = 0;
  listeners: { [id: string]: boolean } = {};

  constructor(public zone: NgZone) {

    // if not electron, quit
    if (!this.isIpcAvailable()) {
      return;
    }

    // Respond to checks if a listener is registered
    chrome.ipcRenderer.on('rx-ipc-check-listener', (event, channel) => {
      const replyChannel = 'rx-ipc-check-reply:' + channel;
      if (this.listeners[channel]) {
        event.sender.send(replyChannel, true);
      } else {
        event.sender.send(replyChannel, false);
      }
    });
  }

  public isIpcAvailable(): boolean {
    return (chrome.ipcRenderer !== undefined);
  }

  checkRemoteListener(channel: string, receiver: Receiver) {
    const target = receiver == null ? chrome.ipcRenderer : receiver;
    return new Promise((resolve, reject) => {
      chrome.ipcRenderer.once('rx-ipc-check-reply:' + channel, (event, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(false);
        }
      });
      target.send('rx-ipc-check-listener', channel);
    });
  }

  public cleanUp() {
    chrome.ipcRenderer.removeAllListeners('rx-ipc-check-listener');
    Object.keys(this.listeners).forEach((channel) => {
      this.removeListeners(channel);
    });
  }

  registerListener(channel: string, observableFactory: ObservableFactoryFunction) {
    this.listeners[channel] = true;
    chrome.ipcRenderer.on(channel, function openChannel(event: ListenerEvent, subChannel: string, ...args: any[]) {
        // Save the listener function so it can be removed
        const replyTo = event.sender;
        const observable = observableFactory(...args);
        observable.subscribe(
          (data) => {
            replyTo.send(subChannel, 'n', data);
          },
          (err) => {
            replyTo.send(subChannel, 'e', err);
          },
          () => {
            replyTo.send(subChannel, 'c');
          }
        );
    });
  }

  removeListeners(channel: string) {
    chrome.ipcRenderer.removeAllListeners(channel);
    delete this.listeners[channel];
  }

  runCommand(channel: string, receiver: Receiver = null, ...args: any[]): Observable<any> {
    const self = this;
    const subChannel = channel + ':' + this.listenerCount;
    this.listenerCount++;
    const target = receiver == null ? chrome.ipcRenderer : receiver;

    target.send(channel, subChannel, ...args);
    return new Observable((observer) => {
      this.checkRemoteListener(channel, receiver)
        .catch(() => {
          observer.error('Invalid channel: ' + channel);
        });
      chrome.ipcRenderer.on(subChannel, function listener(event: Event, type: string, data: Object) {
        self.zone.run(() => {
          switch (type) {
            case 'n':
              observer.next(data);
              break;
            case 'e':
              observer.error((<any>data).error ? (<any>data).error : data);
              break;
            case 'c':
              observer.complete();
          }
          // Cleanup
          return () => {
            // TODO: Why is this not being called & when should it be?
            chrome.ipcRenderer.removeListener(subChannel, listener);
          };
        });
      });
    });
  }

  private _getListenerCount(channel: string) {
    return chrome.ipcRenderer.listenerCount(channel);
  }

}
