import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { CategoryService } from 'app/core/market/api/category/category.service';
import { Category } from 'app/core/market/api/category/category.model';
import { TemplateService } from 'app/core/market/api/template/template.service';
import { ListingService } from 'app/core/market/api/listing/listing.service';
import { Template } from 'app/core/market/api/template/template.model';
import { CountryListService } from 'app/core/market/api/countrylist/countrylist.service';
import { ImageService } from 'app/core/market/api/template/image/image.service';
import { SnackbarService } from 'app/core/snackbar/snackbar.service';
import { RpcStateService } from 'app/core/rpc/rpc-state/rpc-state.service';
import { ModalsService } from 'app/modals/modals.service';
import { InformationService } from 'app/core/market/api/template/information/information.service';
import { LocationService } from 'app/core/market/api/template/location/location.service';
import { EscrowService, EscrowType } from 'app/core/market/api/template/escrow/escrow.service';

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

  itemFormGroup: FormGroup;

  _rootCategoryList: Category = new Category({});
  images: string[];

  // file upload
  dropArea: any;
  fileInput: any;
  picturesToUpload: string[];
  featuredPicture: number = 0;

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
    private modals: ModalsService,
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
  }

  isExistingTemplate() {
    return (this.templateId !== undefined && this.templateId > 0);
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

  removeExistingImage(imageId: number) {
    this.image.remove(imageId).subscribe(
      success => {
        this.snackbar.open('Removed image successfully!')

        // find image in array and remove it.
        let indexToRemove: number;
        this.images.find((element: any, index: number) => {
          if (element.id === imageId) {
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

      console.log(template);
      const country = this.countryList.getCountryByRegion(template.country);
      t.title = template.title;
      t.shortDescription = template.shortDescription;
      t.longDescription = template.longDescription;
      t.category = template.category.id;
      t.country = country? country.name : '';

      t.basePrice = template.basePrice.getAmount();
      t.domesticShippingPrice = template.domesticShippingPrice.getAmount();
      t.internationalShippingPrice = template.internationalShippingPrice.getAmount();

      this.itemFormGroup.patchValue(t);

      this.images = template.images.map(i => {
        return {
          dataId: i.ItemImageDatas[0].dataId,
          id: i.id
        }
      })

      this.preloadedTemplate = template;
      // this.itemFormGroup.get('category').setValue(t.category, {emitEvent: true});
    });
  }

// template add 1 "title" "short" "long" 80 "SALE" "PARTICL" 5 5 5 "Pasdfdfd"
  private save(): Observable<any> {
    if (this.itemFormGroup.invalid) {
      return Observable.throw('Invalid Listing');
    }
    const item = this.itemFormGroup.value;
    const country = this.countryList.getCountryByName(item.country);
    return new Observable((observer) => {
      this.template.add(
        item.title,
        item.shortDescription,
        item.longDescription,
        item.category,
        'SALE',
        'PARTICL',
        +item.basePrice,
        +item.domesticShippingPrice,
        +item.internationalShippingPrice
      ).take(1).subscribe(template => {
        this.templateId = template.id;
        this.log.d('Saved template', template);
        // Need to add location while saving the template
        this.location.update(this.templateId, country, null, null).subscribe();

        // Add escrow
        this.escrow.add(template.id, EscrowType.MAD).subscribe(
          success => {
            if (this.picturesToUpload.length === 0) {
              observer.next(template.id);
              observer.complete()
            }
          }, error => this.snackbar.open(error));

        /* uploading images */
        this.image.upload(template.id, this.picturesToUpload)
          .then((templateId) => {
            observer.next(template.id);
            observer.complete()
          });

      }, error => error.error ? this.snackbar.open(error.error.message) : this.snackbar.open(error));
    });
  }

  private update() {
    const item = this.itemFormGroup.value;
    console.log('country', item.country);

    // update information
    /*
     this.information.update(
     this.templateId,
     item.title,
     item.shortDescription,
     item.longDescription,
     item.category
     ).subscribe();*/

    // update images
    this.image.upload(this.templateId, this.picturesToUpload).then(
      (t) => {
        this.log.d('Uploaded the new images!');
      }
    );
    // update location
    const country = this.countryList.getCountryByName(item.country);
    this.location.update(this.templateId, country, null, null).subscribe(success => {
      this.escrow.update(this.templateId, EscrowType.MAD).subscribe();
    }, error => error.error ? this.snackbar.open(error.error.message) : this.snackbar.open(error));
    // update shipping

    // update messaging
    // update payment
    // update escrow
   

  }

  saveTemplate() {
    this.log.d('Saving as a template.');
    if (this.templateId) {
      // update
      this.itemFormGroup.valid ? this.update() : this.snackbar.open('Invalid Listing');
    } else {
      this.save().subscribe(id => {
        console.log('returning to sell');
        this.snackbar.open('Succesfully Saved!')
        this.backToSell();
      }, err => this.snackbar.open(err));
    }

  }

  saveAndPublish() {
    this.log.d('Saving and publishing the listing.');
    if (this.rpcState.get('locked')) {
      this.modals.open('unlock', {forceOpen: true, timeout: 30, callback: this.callPublish.bind(this)});
    } else {
      this.callPublish();
    }
  }

  callPublish() {
    if (this.templateId) {
      // update
      this.update();
    } else {
      // save new
      this.save().subscribe(id => {
        console.log(id);
        this.template.post(id, 1).take(1).subscribe(listing => {
          
          this.listing.cache.posting(id);
          if (this.preloadedTemplate) {
            this.preloadedTemplate.status = 'awaiting';
          } 
          
          this.snackbar.open('Succesfully added Listing!')
          console.log(listing);
          this.backToSell();
        });
      }, err => this.snackbar.open(err));
    }
  }

}
