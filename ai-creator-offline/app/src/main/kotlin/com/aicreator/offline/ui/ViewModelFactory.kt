package com.aicreator.offline.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory

/** DI manuale per i ViewModel: evita Hilt, coerente con AppContainer. */
inline fun <reified VM : ViewModel> simpleViewModelFactory(crossinline create: () -> VM) = viewModelFactory {
    initializer { create() }
}
