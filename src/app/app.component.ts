import { Component, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material'; // TODO: move to material module?
import { Log } from 'ng2-logger';
import { IpcService } from 'app/core/ipc/ipc.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  log: any = Log.create('app.component');

  // multiwallet: any = [];

  constructor(
    private _iconRegistry: MatIconRegistry,
    private _ipc: IpcService
  ) {
    _iconRegistry
      .registerFontClassAlias('partIcon', 'part-icon')
      .registerFontClassAlias('faIcon', 'fa');

    if (this._ipc.isIpcAvailable()) {
      // Muon extras:
      window.readClipboard = chrome.remote.clipboard.readText;
      delete chrome.remote;
    }

  }

  ngOnInit() {

  }
}
