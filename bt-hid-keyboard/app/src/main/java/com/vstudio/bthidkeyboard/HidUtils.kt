package com.vstudio.bthidkeyboard

object HidUtils {
    // Report Descriptor Standard per una Tastiera HID (101 tasti)
    val KEYBOARD_REPORT_DESCRIPTOR = byteArrayOf(
        0x05.toByte(), 0x01.toByte(), // USAGE_PAGE (Generic Desktop)
        0x09.toByte(), 0x06.toByte(), // USAGE (Keyboard)
        0xa1.toByte(), 0x01.toByte(), // COLLECTION (Application)
        0x85.toByte(), 0x01.toByte(), //   REPORT_ID (1)
        0x05.toByte(), 0x07.toByte(), //   USAGE_PAGE (Keyboard)
        0x19.toByte(), 0xe0.toByte(), //   USAGE_MINIMUM (Keyboard LeftControl)
        0x29.toByte(), 0xe7.toByte(), //   USAGE_MAXIMUM (Keyboard Right GUI)
        0x15.toByte(), 0x00.toByte(), //   LOGICAL_MINIMUM (0)
        0x25.toByte(), 0x01.toByte(), //   LOGICAL_MAXIMUM (1)
        0x75.toByte(), 0x01.toByte(), //   REPORT_SIZE (1)
        0x95.toByte(), 0x08.toByte(), //   REPORT_COUNT (8)
        0x81.toByte(), 0x02.toByte(), //   INPUT (Data,Var,Abs) -> Modifier Byte
        0x95.toByte(), 0x01.toByte(), //   REPORT_COUNT (1)
        0x75.toByte(), 0x08.toByte(), //   REPORT_SIZE (8)
        0x81.toByte(), 0x03.toByte(), //   INPUT (Cnst,Var,Abs) -> Reserved Byte
        0x95.toByte(), 0x06.toByte(), //   REPORT_COUNT (6)
        0x75.toByte(), 0x08.toByte(), //   REPORT_SIZE (8)
        0x15.toByte(), 0x00.toByte(), //   LOGICAL_MINIMUM (0)
        0x25.toByte(), 0x65.toByte(), //   LOGICAL_MAXIMUM (101)
        0x05.toByte(), 0x07.toByte(), //   USAGE_PAGE (Keyboard)
        0x19.toByte(), 0x00.toByte(), //   USAGE_MINIMUM (Reserved)
        0x29.toByte(), 0x65.toByte(), //   USAGE_MAXIMUM (Keyboard Application)
        0x81.toByte(), 0x00.toByte(), //   INPUT (Data,Ary,Abs) -> 6 Key bytes
        0xc0.toByte()                 // END_COLLECTION
    )

    // Mappatura da caratteri italiani/comuni a codici HID tastiera standard
    fun charToHidCode(char: Char): Byte {
        return when (char.lowercaseChar()) {
            in 'a'..'z' -> (char.lowercaseChar() - 'a' + 0x04).toByte()
            in '1'..'9' -> (char - '1' + 0x1e).toByte()
            '0' -> 0x27.toByte()
            ' ' -> 0x2c.toByte()  // Spazio
            '\n' -> 0x28.toByte() // Invio
            '.', ':' -> 0x37.toByte()
            ',', ';' -> 0x36.toByte()
            '-', '_' -> 0x2d.toByte()
            else -> 0x00.toByte()
        }
    }
}
