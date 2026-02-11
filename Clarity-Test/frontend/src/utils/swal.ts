import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import React from 'react'

export const MySwal = withReactContent(Swal.mixin({
  customClass: {
    popup: 'glass-popup',
    title: 'glass-title',
    confirmButton: 'pill-btn primary',
    cancelButton: 'pill-btn secondary',
    input: 'glass-input'
  },
  buttonsStyling: false,
  background: 'transparent',
  showClass: {
    popup: 'animate__animated animate__fadeInUp animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutDown animate__faster'
  }
}))

export function toastSuccess(title: string) {
  return MySwal.fire({
    toast: true,
    position: 'bottom-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#ffffff',
    customClass: {
      popup: 'modern-toast'
    }
  })
}

export function toastError(title: string) {
  return MySwal.fire({
    toast: true,
    position: 'bottom-end',
    icon: 'error',
    title,
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    background: '#ffffff',
    customClass: {
      popup: 'modern-toast'
    }
  })
}

export function confirm(title: string, text?: string) {
  return MySwal.fire({
    title,
    text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    iconColor: '#3b82f6',
    reverseButtons: true
  }).then((r) => r.isConfirmed)
}

export function inputText(title: string, label?: string, value?: string) {
  return MySwal.fire({
    title,
    input: 'text',
    inputLabel: label,
    inputValue: value || '',
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar',
    preConfirm: (val) => {
      if (!val || (typeof val === 'string' && val.trim() === '')) {
        Swal.showValidationMessage('El valor no puede estar vacío')
      }
      return val
    }
  }).then((r) => (r.isConfirmed ? r.value : null))
}

export function select(title: string, options: Record<string, string>) {
  return MySwal.fire({
    title,
    input: 'select',
    inputOptions: options,
    inputPlaceholder: 'Selecciona una opción',
    showCancelButton: true,
    confirmButtonText: 'Aceptar',
    cancelButtonText: 'Cancelar'
  }).then((r) => (r.isConfirmed ? r.value : null))
}

export async function folderCustomizer(currentName: string, currentColor?: string) {
  const colors = [
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Azul', hex: '#3b82f6' },
    { name: 'Rojo', hex: '#ef4444' },
    { name: 'Ambar', hex: '#f59e0b' },
    { name: 'Purpura', hex: '#8b5cf6' },
    { name: 'Rosa', hex: '#ec4899' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Gris', hex: '#64748b' },
  ]

  return MySwal.fire({
    title: 'Personalizar carpeta',
    html: `
      <div style="text-align: left; margin-bottom: 10px; font-weight: 500; color: #475569;">Nombre:</div>
      <input id="swal-folder-name" class="glass-input" style="width: 100%; margin-top: 0; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;" value="${currentName}">
      <div style="text-align: left; margin-bottom: 10px; font-weight: 500; color: #475569;">Color:</div>
      <div id="swal-color-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        ${colors.map(c => `
          <div 
            class="swal-color-opt ${currentColor === c.hex ? 'active' : ''}" 
            data-hex="${c.hex}" 
            style="background: ${c.hex}; height: 40px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: ${currentColor === c.hex ? '3px solid #000' : 'none'}; box-shadow: ${currentColor === c.hex ? '0 0 0 2px #fff' : 'none'};"
            onclick="
              document.querySelectorAll('.swal-color-opt').forEach(el => {
                el.style.border='none';
                el.style.boxShadow='none';
              });
              this.style.border='3px solid #000'; 
              this.style.boxShadow='0 0 0 2px #fff';
            "
          ></div>
        `).join('')}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const name = (document.getElementById('swal-folder-name') as HTMLInputElement).value
      const activeColor = Array.from(document.querySelectorAll('.swal-color-opt')).find(el => (el as HTMLElement).style.border !== 'none' && (el as HTMLElement).style.border !== '') as HTMLElement
      
      if (!name) {
        Swal.showValidationMessage('El nombre es obligatorio')
        return false
      }
      
      return {
        name,
        color: activeColor ? activeColor.dataset.hex : currentColor
      }
    }
  }).then((r) => (r.isConfirmed ? r.value : null))
}

export default MySwal
