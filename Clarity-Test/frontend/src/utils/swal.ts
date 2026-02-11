import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import React from 'react'

const MySwal = withReactContent(Swal.mixin({
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

export default MySwal
