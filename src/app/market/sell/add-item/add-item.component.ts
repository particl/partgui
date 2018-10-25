import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { CategoryService } from 'app/core/market/api/category/category.service';
import { Category } from 'app/core/market/api/category/category.model';
import { Amount } from '../../../core/util/utils';
import { TemplateService } from 'app/core/market/api/template/template.service';
import { ListingService } from 'app/core/market/api/listing/listing.service';
import { Template } from 'app/core/market/api/template/template.model';
import { CountryListService } from 'app/core/market/api/countrylist/countrylist.service';
import { ImageService } from 'app/core/market/api/template/image/image.service';
import { SnackbarService } from 'app/core/snackbar/snackbar.service';
import { RpcStateService } from 'app/core/rpc/rpc-state/rpc-state.service';
import { ModalsHelperService } from 'app/modals/modals.module';
import { InformationService } from 'app/core/market/api/template/information/information.service';
import { LocationService } from 'app/core/market/api/template/location/location.service';
import { EscrowService, EscrowType } from 'app/core/market/api/template/escrow/escrow.service';
import { Image } from 'app/core/market/api/template/image/image.model';
import { Country } from 'app/core/market/api/countrylist/country.model';

@Component({
  selector: 'app-add-item',
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss']
})
export class AddItemComponent implements OnInit, OnDestroy {

  log: any = Log.create('add-item.component');
  private destroyed: boolean = false;
  // template id
  templateId: number;
  preloadedTemplate: Template;
  keys: string[] = ['-', 'e', 'E', '+'];
  itemFormGroup: FormGroup;

  _rootCategoryList: Category = new Category({});
  images: Image[];

  // file upload
  dropArea: any;
  fileInput: any;
  picturesToUpload: string[];
  featuredPicture: number = 0;
  expiration: number = 4;
  txFee: Amount = new Amount(0)
  selectedCountry: Country;
  selectedCategory: Category;
  isInProcess: boolean = false;

  expiredList: Array<any> = [
    { title: '4 day',     value: 4  },
    { title: '1 week',    value: 7  },
    { title: '2 weeks',   value: 14 },
    { title: '3 weeks',   value: 21 },
    { title: '4 weeks',   value: 28 }
  ];
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private category: CategoryService,
    private template: TemplateService,
    private image: ImageService,
    private information: InformationService,
    private location: LocationService,
    private listing: ListingService,
    private snackbar: SnackbarService,
    private rpcState: RpcStateService,

    // @TODO rename ModalsHelperService to ModalsService after modals service refactoring.
    private modals: ModalsHelperService,
    private countryList: CountryListService,
    private escrow: EscrowService
  ) { }

  ngOnInit() {

    // TODO: drag and drop
    this.dropArea = document.getElementById('drag-n-drop');

    this.fileInput = document.getElementById('fileInput');
    this.fileInput.onchange = this.processPictures.bind(this);
    this.picturesToUpload = new Array();

    this.subToCategories();

    this.itemFormGroup = this.formBuilder.group({
      title:                      ['', [Validators.required]],
      shortDescription:           ['', [Validators.required,
                                        Validators.maxLength(200)]],
      longDescription:            ['', [Validators.required,
                                        Validators.maxLength(1000)]],
      category:                   ['', [Validators.required]],
      country:                    ['', [Validators.required]],
      basePrice:                  ['', [Validators.required, Validators.min(0)]],
      domesticShippingPrice:      ['', [Validators.required, Validators.min(0)]],
      internationalShippingPrice: ['', [Validators.required, Validators.min(0)]]
    });

    this.route.queryParams.take(1).subscribe(params => {
      const id = params['id'];
      const clone: boolean = params['clone'];
      if (id) {
        this.templateId = +id;
        this.preload();
      }
      if (clone) {
        this.log.d('Cloning listing!');
        this.templateId = undefined;
      }
    });

    this.loadTransactionFee();
  }

  isExistingTemplate() {
    return this.preloadedTemplate || (this.templateId !== undefined && this.templateId > 0);
  }

  uploadPicture() {
    this.fileInput.click();
  }

  // @TODO : remove type any
  processPictures(event: any) {
    Array.from(event.target.files).map((file: File) => {
      const reader = new FileReader();
      reader.onload = _event => {
        this.picturesToUpload.push(reader.result);
        this.log.d('added picture', file.name);
      };
      reader.readAsDataURL(file);
    });
  }

  removeExistingImage(image: Image) {
    this.image.remove(image.id).subscribe(
      success => {
        this.snackbar.open('Removed image successfully!')

        // find image in array and remove it.
        let indexToRemove: number;
        this.images.find((element: Image, index: number) => {
          if (element.id === image.id) {
            indexToRemove = index;
            return true;
          }
          return false;
        });
        if (indexToRemove >= 0) {
          this.log.d('Removing image from UI with index', indexToRemove);
          this.images.splice(indexToRemove, 1);
        }
      },
      error => this.snackbar.open(error)
    );
  }

  removePicture(index: number) {
    this.picturesToUpload.splice(index, 1);
    if (this.featuredPicture > index) {
      this.featuredPicture -= 1;
    }
  }

  featurePicture(index: number) {
    this.featuredPicture = index;
  }

  subToCategories() {
    this.category.list()
      .takeWhile(() => !this.destroyed)
      .subscribe(list => this.updateCategories(list));
  }

  updateCategories(list: Category) {
    this.log.d('Updating category list');
    this._rootCategoryList = list;
  }

  backToSell() {
    this.router.navigate(['/market/sell']);
  }

  ngOnDestroy() {
    this.destroyed = true;
  }

  preload() {
    this.log.d(`preloading for id=${this.templateId}`);
    this.template.get(this.templateId).subscribe((template: Template) => {
      this.log.d(`preloaded id=${this.templateId}!`);

      if (this.listing.cache.isAwaiting(template)) {
        template.status = 'awaiting';
      }

      const t = {
        title: '',
        shortDescription: '',
        longDescription: '',
        category: 0,
        basePrice: 0,
        domesticShippingPrice: 0,
        internationalShippingPrice: 0,
        country: ''
      };

      this.log.d('template', template);
      const country = this.countryList.getCountryByRegion(template.country);
      t.title = template.title;
      t.shortDescription = template.shortDescription;
      t.longDescription = template.longDescription;
      t.category = template.category.id;
      t.country = country ? country.name : '';

      // set default value as selected.
      this.setDefaultCountry(country);
      this.setDefaultCategory(template.category);

      t.basePrice = template.basePrice.getAmount();
      t.domesticShippingPrice = template.domesticShippingPrice.getAmount();
      t.internationalShippingPrice = template.internationalShippingPrice.getAmount();
      this.itemFormGroup.patchValue(t);

      this.images = template.imageCollection.images;

      this.preloadedTemplate = template;
      // this.itemFormGroup.get('category').setValue(t.category, {emitEvent: true});
    });
  }

  setDefaultCountry(country: Country) {
    this.selectedCountry = country;
  }


  setDefaultCategory(category: Category) {
    this.selectedCategory = category;
  }

  private async save(): Promise<Template> {
    const item = this.itemFormGroup.value;
    const country = this.countryList.getCountryByName(item.country);

    const template: Template = await this.template.add(
      item.title,
      item.shortDescription,
      item.longDescription,
      item.category,
      'SALE',
      'PARTICL',
      +item.basePrice,
      +item.domesticShippingPrice,
      +item.internationalShippingPrice
    ).toPromise();


    this.templateId = template.id;
    this.preloadedTemplate = template;

    await this.location.execute('add', this.templateId, country, null, null).toPromise();
    await this.escrow.add(template.id, EscrowType.MAD).toPromise();

    if (this.picturesToUpload.length === 0) {
      return template;
    } else {
      await this.image.upload(template, this.picturesToUpload);
    }

    return this.template.get(this.preloadedTemplate.id).toPromise();
    /*


      }, error => error.error ? this.snackbar.open(error.error.message) : this.snackbar.open(error));
          });
      */

  }

  private async update() {
    const item = this.itemFormGroup.value;
    // update information
    /*
     this.information.update(
     this.templateId,
     item.title,
     item.shortDescription,
     item.longDescription,
     item.category
     ).subscribe();*/

    // update location
    const country = this.countryList.getCountryByName(item.country);
    await this.location.execute('update', this.templateId, country, null, null).toPromise();
     // update escrow
    await this.escrow.update(this.templateId, EscrowType.MAD).toPromise();
    if (this.picturesToUpload.length > 0) {
      // update images
      await this.image.upload(this.preloadedTemplate, this.picturesToUpload);
    }
     return this.template.get(this.preloadedTemplate.id).toPromise();
  }

  validate() {
    return this.itemFormGroup.valid || this.snackbar.open('Invalid Listing');
  }

  numericValidator(event: any) {
    // Special character validation
    const pasted = String(event.clipboardData ? event.clipboardData.getData('text') : '' );
    if (this.keys.includes(event.key) || pasted.split('').find((c) =>  this.keys.includes(c))) {
      return false;
    }
  }

  public async upsert() {
    if (!this.validate()) {
      return;
    };
    this.log.d('Saving as a template.');

    if (this.preloadedTemplate && this.preloadedTemplate.id) {
      this.log.d(`Updating existing template ${this.preloadedTemplate.id}`);
      return this.update();
    } else {
      this.log.d(`Creating new template`);
      return this.save();
    }
  }

  public saveTemplate() {
    if (this.preloadedTemplate && this.preloadedTemplate.status === 'published') {
      this.snackbar.open('You can not update templates whilst they are published!');
      return;
    }

    this.upsert()
    .then(t => {
      this.snackbar.open('Succesfully updated template!')
    })
    .catch(err => {
      this.snackbar.open('Failed to save template!')
    });
  }

  saveAndPublish() {
    if (!this.validate()) {
      return;
    };
    this.isInProcess = true;
    this.log.d('Saving and publishing the listing.');
    this.publish();
  }

  onCountryChange(country: Country): void {
    this.itemFormGroup.patchValue({ country: country ? country.name : '' })
  }


  onCategoryChange(category: Category): void {
    this.itemFormGroup.patchValue({ category: (category ? category.id : undefined) })
  }

  private async publish() {
    this.upsert().then(t => {
      this.modals.unlock({timeout: 30}, (status) => {
        this.template.post(t, 1, this.expiration)
        .subscribe(listing => {
          this.snackbar.open('Succesfully added Listing!')
          this.log.d(listing);
          this.backToSell();
        },
        (error) => {
          this.isInProcess = false;
          this.snackbar.open(error)
        },
        () => this.isInProcess = false)
      }, (err) => this.isInProcess = false);
    }, err => {
      this.isInProcess = false;
      this.snackbar.open(err)
    });
  }

  loadTransactionFee() {
    /* @TODO transaction fee will be calculated from backend
     * currently we have assumed days_retention=1 costs 0.26362200
     */
    this.txFee = new Amount(0.26362200 * this.expiration)
  }

}
