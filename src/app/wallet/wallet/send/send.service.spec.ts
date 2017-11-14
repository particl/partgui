import { TestBed, inject } from '@angular/core/testing';

import { RpcModule } from '../../core/rpc/rpc.module';
import { SharedModule } from '../../shared/shared.module';

import { SendService } from './send.service';
import { FlashNotificationService } from '../../services/flash-notification.service';
import { MdSnackBarModule } from '@angular/material';

describe('SendService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedModule,
        RpcModule.forRoot(),
        MdSnackBarModule
      ],
      providers: [SendService, FlashNotificationService]
    });
  });

  it('should be created', inject([SendService], (service: SendService) => {
    expect(service).toBeTruthy();
  }));
});
