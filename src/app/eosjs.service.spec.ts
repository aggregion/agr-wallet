import { TestBed, inject } from '@angular/core/testing';

import { AGRJSService } from './eosjs.service';

describe('AGRJSService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AGRJSService]
    });
  });

  it('should be created', inject([AGRJSService], (service: AGRJSService) => {
    expect(service).toBeTruthy();
  }));
});
