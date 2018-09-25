import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { MarketStateService } from 'app/core/market/market-state/market-state.service';
import { SnackbarService } from 'app/core/snackbar/snackbar.service';
import { Listing } from 'app/core/market/api/listing/listing.model';
import { PostListingCacheService } from 'app/core/market/market-cache/post-listing-cache.service';
import { ProposalsService } from 'app/wallet/proposals/proposals.service';

@Component({
  selector: 'app-preview-listing',
  templateUrl: './preview-listing.component.html',
  styleUrls: ['./preview-listing.component.scss']
})

export class PreviewListingComponent implements OnInit, OnDestroy {

  private destroyed: boolean = false;

  public pictures: Array<any> = new Array();
  public price: any;
  public date: string;
  public profileAddress: string = '';
  private currencyprice: number = 0;

  constructor(
    private dialogRef: MatDialogRef<PreviewListingComponent>,
    private marketState: MarketStateService,
    private listingServiceCache: PostListingCacheService,
    private proposalsService: ProposalsService,
    private snackbarService: SnackbarService,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit() {
    this.marketState.observe('currencyprice')
      .takeWhile(() => !this.destroyed)
      .subscribe(price => {
        this.currencyprice = price[0].price;
      });
    this.getVoteOfListing();
  }

  getVoteOfListing(): void {
    if (this.data && this.data.listing && this.data.listing.proposalHash) {
      this.proposalsService.get(this.data.listing.proposalHash)
        .take(1)
        .subscribe((vote: any) => {
          this.data.listing.VoteDetails = vote;
        })
    }
  }

  voteForListing(optionId: number): void {
    const params = [
      this.data.listing.proposalHash,
      optionId
    ];
    this.proposalsService.vote(params).subscribe((response) => {
      this.snackbarService.open(`Successfully Vote for ${this.data.listing.title}`, 'info');
      this.getVoteOfListing();
    })
  }

  dialogClose(): void {
    this.dialogRef.close();
  }

  ngOnDestroy() {
    this.destroyed = true;
  }
}
