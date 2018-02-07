import {
  Component,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { Log } from 'ng2-logger';

import { DateFormatter } from '../../../../../wallet/shared/util/utils';
import { RpcService } from '../../../../../core/core.module';
import { SnackbarService } from '../../../../../core/snackbar/snackbar.service';
import { Command } from './command.model';

@Component({
  selector: 'app-console-modal',
  templateUrl: './console-modal.component.html',
  styleUrls: ['./console-modal.component.scss']
})
export class ConsoleModalComponent implements OnInit, AfterViewChecked {

  @ViewChild('debug') private commandContainer: ElementRef;
  log: any = Log.create('app-console-modal');
  public commandList: Command[] = [];
  public command: string;
  public currentTime: string;
  public disableScrollDown: boolean = false;

  constructor(private _rpc: RpcService,
              private dialog: MatDialogRef<ConsoleModalComponent>,
              private snackbar: SnackbarService) {
  }

  ngOnInit() {
    this.getCurrentTime();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  rpcCall() {
    const params = this.command.split(' ');

    // TODO: Remove next release
    const daemonVersion = this._rpc.state.get('subversion');
    if (daemonVersion === '/Satoshi:0.15.1.1/') {
        this._rpc.call(params.shift(), params)
          .subscribe(
            response => this.formatSuccessResponse(response),
            error => this.formatErrorResponse(error));
        return;
    }

    if (params.length > 0) {
        params.splice(1, 0, ''); // TODO: Add wallet name here for multiwallet
    }
    this._rpc.call('runstrings', params)
      .subscribe(
        response => this.formatSuccessResponse(response),
        error => this.formatErrorResponse(error));
  }

  formatSuccessResponse(response: any) {
    this.commandList.push(new Command(1, this.command, this.getDateFormat()),
      new Command(2, response, this.getDateFormat(), 200));
    this.command = '';
    this.scrollToBottom();
  }

  formatErrorResponse(error: any) {
    if (error.code === -1) {
      this.commandList.push(new Command(1, this.command, this.getDateFormat()),
        new Command(2, error.message, this.getDateFormat(), -1));
      this.command = '';
      this.scrollToBottom();
    } else {
      const erroMessage = (error.message) ? error.message : 'Method not found';
      this.snackbar.open(erroMessage);
    }
  }

  isJson(text: any) {
    return (typeof text === 'object');
  }

  clearCommands() {
    this.commandList = [];
  }

  /* Time stuff */

  getCurrentTime() {
    this.currentTime = this.getDateFormat();
  }

  getDateFormat() {
    return new DateFormatter(new Date()).hourSecFormatter();
  }

  scrollToBottom() {
    if (this.disableScrollDown) {
      return
    }
    this.commandContainer.nativeElement.scrollTop = this.commandContainer.nativeElement.scrollHeight;
  }

  onScroll() {
    const element = this.commandContainer.nativeElement
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight
    if (this.disableScrollDown && atBottom) {
        this.disableScrollDown = false
    } else {
        this.disableScrollDown = true
    }
  }


  // capture the enter button
  @HostListener('window:keydown', ['$event'])
  keyDownEvent(event: any) {
    if (event.keyCode === 13) {
      this.disableScrollDown = false;
      this.rpcCall();
    }
    if (event.ctrlKey && event.keyCode === 76) {
      this.clearCommands();
    }
  }

  close(): void {
    this.dialog.close();
  }

}
