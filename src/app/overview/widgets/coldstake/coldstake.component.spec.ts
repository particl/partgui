import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ColdstakeComponent } from './coldstake.component';
import { SharedModule } from '../../../shared/shared.module';

import { FlexLayoutModule } from '@angular/flex-layout';
import { MdCardModule } from '@angular/material';

describe('ColdstakeComponent', () => {
  let component: ColdstakeComponent;
  let fixture: ComponentFixture<ColdstakeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedModule,
        FlexLayoutModule,
        MdCardModule
      ],
      declarations: [ ColdstakeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ColdstakeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
