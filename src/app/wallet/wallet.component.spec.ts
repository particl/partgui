import { TestBed, async } from '@angular/core/testing';
import { APP_BASE_HREF } from '@angular/common';

import { RouterTestingModule } from '@angular/router/testing';

import { WalletViewsModule } from './wallet.module';
import { WalletViewsComponent } from './wallet.component';

import { WindowService } from './core/window.service';

describe('WalletViewsComponent', () => {

let component: WalletViewsComponent;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports : [
        RouterTestingModule,
        AppModule
      ],
      providers: [ {provide: APP_BASE_HREF, useValue: '/'} ]
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(WalletViewsComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
    component = app;
  });
/*
  it('should test firstTime running', () => {
    component.firsttime();
    expect(component.firsttime).toBe();
  });

  it('should sync', () => {
  component.sync();
    expect(component.syncing).toBeTruthy();
  });

  it('should unlock', () => {
    component.unlock();
    expect(component.unlock).toBeTruthy();
  });
  */
/*
  it('should render title in a h1 tag', async(() => {
    const fixture = TestBed.createComponent(WalletViewsComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('app works!');
  }));
*/
  it('should get isCollapsed', () => {
    expect(component.isCollapsed).toBeTruthy()
  });

it('should get isFixed', () => {
  expect(component.isFixed).toBeFalsy();
});

it('should get log', () => {
  expect(component.log).toBeDefined();
});

it('should get title', () => {
  expect(component.title).toBe('');
});

it('should get window', () => {
  expect(component.window).toBeDefined();
});
});
