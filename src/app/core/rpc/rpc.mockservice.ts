import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { RpcService } from './rpc.service';
import { Result } from './rpc.responses';
/*
    This is a fake mock service used for the RpcService.
*/
@Injectable()
export class MockRpcService {

  call(method: string, params?: Array<any> | null): Observable<any> {
    // Switching for different methods and return response accordngly.
    let json = {};
    switch (method) {
      case 'filtertransactions':
        json = Result[method];
        break;
      case 'filteraddresses':
        if (params.length > 1) {
          json = Result[method]['addresses'];
        } else {
          json = Result[method]['addresscount'];
        }
        break;
      default:
        break;
    }
    return Observable.of(json);
  }
};
