import { Component, OnInit, OnDestroy } from '@angular/core';
import { Log } from 'ng2-logger';

import { Category } from 'app/core/market/api/category/category.model';
import { Listing } from '../../core/market/api/listing/listing.model';

import { CategoryService } from 'app/core/market/api/category/category.service';
import { ListingService } from 'app/core/market/api/listing/listing.service';
import { CountryListService } from 'app/core/market/api/countrylist/countrylist.service';
import { FavoritesService } from '../../core/market/api/favorites/favorites.service';
import { Country } from 'app/core/market/api/countrylist/country.model';
import { take } from 'rxjs/operators';
import { throttle } from 'lodash';


interface ISorting {
  value: string;
  viewValue: string;
}

interface IPage {
  pageNumber: number,
  listings: Array<any>;
}

@Component({
  selector: 'app-listing',
  templateUrl: './listings.component.html',
  styleUrls: ['./listings.component.scss']
})

export class ListingsComponent implements OnInit, OnDestroy {
  // general
  log: any = Log.create('listing-item.component');
  private destroyed: boolean = false;

  // loading
  public isLoading: boolean = false; // small progress bars
  public isLoadingBig: boolean = true; // big animation

  // filters
  // countries: FormControl = new FormControl();
  search: string;
  flagged: boolean = false;
  listingServiceSubcription: any;
  private resizeEventer: any;
  // categories: FormControl = new FormControl();

  _rootCategoryList: Category = new Category({});

  // sorting
  sortings: Array<ISorting> = [
    {value: 'newest', viewValue: 'Newest'},
    {value: 'popular', viewValue: 'Popular'},
    {value: 'price-asc', viewValue: 'Cheapest'},
    {value: 'price-des', viewValue: 'Most expensive'}
  ];

  pages: Array<IPage> = [];
  noMoreListings: boolean = false;

  // pagination
  pagination: any = {
    maxPages: 3,
    maxPerPage: 24,
    // hooks into the scroll bar of the main page..
    infinityScrollSelector: '.mat-drawer-content' // .mat-drawer-content
  };

  filters: any = {
    category: undefined,
    search: undefined,
    country: undefined
  };

  selectedCountry: Country;

  constructor(
    private category: CategoryService,
    private listingService: ListingService,
    private favoritesService: FavoritesService,
    public countryList: CountryListService
  ) {
    this.log.d('overview created');
    if (this.listingService.cache.selectedCountry) {
      this.selectedCountry = this.listingService.cache.selectedCountry
    }
    this.getScreenSize();
  }

  ngOnInit() {
    this.loadCategories();
    this.loadPage(0);
    this.resizeEventer = throttle(() => this.getScreenSize(), 400, {leading: false, trailing: true});
    try {
      window.addEventListener('resize', this.resizeEventer);
    } catch (err) { }
  }

  loadCategories() {
    this.category.list()
    .subscribe(
      list => {
        this._rootCategoryList = list;
      });
  }

  loadPage(pageNumber: number, clear?: boolean) {
    // set loading aninmation
    this.isLoading = true;

    // params
    const max = this.pagination.maxPerPage;
    const search = this.filters.search;
    const category = this.filters.category;
    const country = this.filters.country;

    /*
      We store the subscription each time, due to API delays.
      A search might not resolve synchronically, so a previous search
      may overwrite a search that was initiated later on.
      So store the subscription, then stop listening if a new search
      or page load is triggered.
    */
    if (this.listingServiceSubcription) {
      this.listingServiceSubcription.unsubscribe();
    }

    this.listingServiceSubcription = this.listingService.search(pageNumber, max, null, search, category, country, this.flagged)
      .pipe(take(1)).subscribe((listings: Array<Listing>) => {
      this.isLoading = false;
      this.isLoadingBig = false;

      // new page
      const page = {
        pageNumber: pageNumber,
        listings: listings
      };

      // should we clear all existing pages? e.g search
      if (clear === true) {
        this.pages = [page];
        this.noMoreListings = false;
      } else { // infinite scroll
        if (listings.length > 0) {
          this.pushNewPage(page);
        } else {
          this.noMoreListings = true;
        }
      }
    })
  }

  pushNewPage(page: IPage) {
    const newPageNumber = page.pageNumber;
    let goingDown = true; // direction

    // previous page
    if (this.pages[0] && this.pages[0].pageNumber > newPageNumber) {
      this.log.d('adding page to top');
      this.pages.unshift(page);
      goingDown = false;
    } else { // next page
      this.log.d('adding page to bottom');
      this.pages.push(page);
    }

    // if exceeding max length, delete a page of the other direction
    if (this.pages.length > this.pagination.maxPages) {
      if (goingDown) {
        this.pages.shift(); // delete first page
      } else {
        this.pages.pop(); // going up, delete last page
      }
    }
  }

  clearAndLoadPage() {
    this.loadPage(0, true);
  }

  // TODO: fix scroll up!
  loadPreviousPage() {
    this.log.d('prev page trigered');
    if (this.pages.length) {
      let previousPage = this.pages[0].pageNumber;
      previousPage--;
      this.log.d('loading prev page' + previousPage);
      if (previousPage > -1) {
        this.loadPage(previousPage);
      }
    }
  }

  loadNextPage() {
    if (this.pages.length) {
      let nextPage = this.pages[this.pages.length - 1].pageNumber; nextPage++;
      this.log.d('loading next page: ' + nextPage);
      this.loadPage(nextPage);
    }
  }

  changeLocation(country: Country) {
    this.listingService.cache.selectedCountry = country || undefined;
  }

  onCountryChange(country: Country): void {
    this.filters.country = country ? country.iso : undefined;
    this.clearAndLoadPage();
  }

  onCategoryChange(category: any): void {
    if (!category || category.id) {
      this.filters.category = category ? category.id : undefined;
      this.clearAndLoadPage();
    }

  }

  toggleFlag(event: any): void {
    this.flagged = event.source.checked;
    this.loadPage(0, true);
  }

  getScreenSize() {
    const currentMaxPerPage = this.pagination.maxPerPage;
    const newMaxPerPage = window.innerHeight > 1330 ? 20 : 10;
    const isLarger = (newMaxPerPage - currentMaxPerPage) > 0;

    if (isLarger) {
      // Load more pages to fill the screen
      // maxPages 2 -> 3, ensure no pages are deleted when loading
      // the next page.
      this.pagination.maxPages = 3;
      this.pagination.maxPerPage = newMaxPerPage;
      this.loadNextPage();
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    try {
      window.removeEventListener('resize', this.resizeEventer);
    } catch (err) { }
  }
}
