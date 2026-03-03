import { Directive, Input, TemplateRef, ViewContainerRef, OnInit } from '@angular/core';
import { RoleService } from '../services/role/role.service';

@Directive({
  selector: '[showIfModule]',
  standalone: true
})
export class ShowIfModuleDirective implements OnInit {
  @Input('showIfModule') moduleName: string = '';

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.updateView();
    
    // Suscribirse a cambios en los módulos visibles
    this.roleService.getVisibleModules().subscribe(() => {
      this.updateView();
    });
  }

  private updateView(): void {
    const isVisible = this.roleService.isModuleVisible(this.moduleName);
    
    if (isVisible) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
