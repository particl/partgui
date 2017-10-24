import { Component } from '@angular/core';
import { Log } from 'ng2-logger';

import { StateService } from '../../../core/state/state.service';

@Component({
  selector: 'app-stakinginfo',
  templateUrl: './stakinginfo.component.html',
  styleUrls: ['./stakinginfo.component.scss']
})
export class StakinginfoComponent {


  /*  General   */
  log: any = Log.create('send.component');


  /*  UI   */
  dynamicStakingReward: number = 2;


  /*  RPC   */
  private curStakeReward: number = 0;
  public curWeight: number = 1;
  private curSupply: number = 0;


  constructor(
    private state: StateService
    ) {
    this.log.d(`constructor, started`);
    this.state.observe('percentyearreward')
    .subscribe(
      success => {
        this.log.d(`setting curStakeReward ${success}`);
        this.curStakeReward = success;
        this.calculateDynamicStakingReward();
      },
      error => this.log.er('Constructor, percentyearreward error:' + error));


    this.state.observe('netstakeweight')
    .subscribe(
      success => {
        this.log.d(`setting weight ${success}`);
        this.curWeight = success / (10000000);
        this.calculateDynamicStakingReward();
      },
      error => this.log.er('Constructor, weight error:' + error));

    this.state.observe('moneysupply')
    .subscribe(
      success => {
        this.log.d(`setting moneysupply ${success}`);
        this.curSupply = success;
        this.calculateDynamicStakingReward();
      },
      error => this.log.er('Constructor, moneysupply error:' + error));

  }

  private calculateDynamicStakingReward() {
    this.dynamicStakingReward = Math.floor(this.curStakeReward * (this.curSupply / this.curWeight));
    this.curWeight = Math.floor(this.curWeight);
    this.log.d(`calculateDynamicStakingReward, dynamicStakingReward = ${this.dynamicStakingReward}`);
  }


  public splitAmountByDot(int: number, afterDot: boolean) {
    if ((int.toString()).indexOf('.') >= 0) {
      return (int.toString()).split('.')[+afterDot];
    } else {
      return '0';
    }
  }

}
