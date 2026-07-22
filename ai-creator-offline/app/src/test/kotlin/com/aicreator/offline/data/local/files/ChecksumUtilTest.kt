package com.aicreator.offline.data.local.files

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import java.io.File

class ChecksumUtilTest {

    @get:Rule
    val tempFolder = TemporaryFolder()

    @Test
    fun `stesso contenuto produce lo stesso checksum`() {
        val file1 = tempFolder.newFile("a.bin")
        val file2 = tempFolder.newFile("b.bin")
        file1.writeBytes(byteArrayOf(1, 2, 3, 4, 5))
        file2.writeBytes(byteArrayOf(1, 2, 3, 4, 5))

        assertEquals(ChecksumUtil.sha256File(file1), ChecksumUtil.sha256File(file2))
    }

    @Test
    fun `contenuto diverso produce checksum diverso`() {
        val file1 = tempFolder.newFile("a.bin")
        val file2 = tempFolder.newFile("b.bin")
        file1.writeBytes(byteArrayOf(1, 2, 3))
        file2.writeBytes(byteArrayOf(1, 2, 4))

        assertNotEquals(ChecksumUtil.sha256File(file1), ChecksumUtil.sha256File(file2))
    }

    @Test
    fun `checksum di cartella e deterministico e sensibile ai nomi file`() {
        val dir = tempFolder.newFolder("pkg")
        File(dir, "manifest.json").writeText("{}")
        File(dir, "weights.bin").writeBytes(byteArrayOf(9, 9, 9))

        val first = ChecksumUtil.sha256Directory(dir)
        val second = ChecksumUtil.sha256Directory(dir)
        assertEquals(first, second)

        val renamedDir = tempFolder.newFolder("pkg2")
        File(renamedDir, "manifest.json").writeText("{}")
        File(renamedDir, "weights_renamed.bin").writeBytes(byteArrayOf(9, 9, 9))
        assertNotEquals(first, ChecksumUtil.sha256Directory(renamedDir))
    }
}
