import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LogPage } from './log';

describe('LogPage', () => {
  it('creates', async () => {
    await TestBed.configureTestingModule({
      imports: [LogPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(LogPage);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
