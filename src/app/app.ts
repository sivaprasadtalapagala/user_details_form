import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly formBuilder = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly isSubmitting = signal(false);
  protected readonly submissionSucceeded = signal(false);
  protected readonly submissionFailed = signal(false);
  protected readonly submittedName = signal('');
  protected readonly customerDetailsVisible = signal(false);
  protected readonly isLoadingCustomers = signal(false);
  protected readonly customersLoaded = signal(false);
  protected readonly customersError = signal('');
  protected readonly customers = signal<CustomerDetails[]>([]);

  protected readonly detailsForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    mobile: ['', [Validators.required, Validators.pattern(/^\+?(?:[\s()-]*\d){7,15}[\s()-]*$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    interested: false,
  });

  protected showError(field: 'name' | 'mobile' | 'email'): boolean {
    const control = this.detailsForm.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  protected toggleCustomerDetails(): void {
    const shouldShowDetails = !this.customerDetailsVisible();
    this.customerDetailsVisible.set(shouldShowDetails);

    if (shouldShowDetails && !this.customersLoaded() && !this.isLoadingCustomers()) {
      this.loadCustomerDetails();
    }
  }

  protected loadCustomerDetails(): void {
    this.customersError.set('');
    this.isLoadingCustomers.set(true);
    this.http.get<CustomerDetails[]>('/api/users').subscribe({
      next: (customers) => {
        this.customers.set(customers);
        this.customersLoaded.set(true);
        this.isLoadingCustomers.set(false);
      },
      error: () => {
        this.customersError.set('We could not load customer details. Please try again.');
        this.isLoadingCustomers.set(false);
      },
    });
  }

  protected submit(): void {
    this.submissionSucceeded.set(false);
    this.submissionFailed.set(false);

    if (this.detailsForm.invalid) {
      this.detailsForm.markAllAsTouched();
      return;
    }

    const formValue = this.detailsForm.getRawValue();
    const mobile = formValue.mobile.replace(/[\s()-]/g, '');
    this.isSubmitting.set(true);
    this.http.post<{ success: true }>('/api/users', { ...formValue, mobile }).subscribe({
      next: () => {
        this.submittedName.set(formValue.name.trim());
        this.submissionSucceeded.set(true);
        this.detailsForm.reset({ name: '', mobile: '', email: '', interested: false });
        this.customersLoaded.set(false);
        this.isSubmitting.set(false);
        if (this.customerDetailsVisible()) {
          this.loadCustomerDetails();
        }
      },
      error: () => {
        this.submissionFailed.set(true);
        this.isSubmitting.set(false);
      },
    });
  }
}

interface CustomerDetails {
  name: string;
  mobile: string;
  email: string;
  interested: boolean;
  createdAt: string;
}
