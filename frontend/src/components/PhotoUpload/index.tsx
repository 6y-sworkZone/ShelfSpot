import { useState, useEffect } from 'react'
import { Upload, Modal, message, Image } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadProps, UploadFile } from 'antd'
import { uploadItemPhotos } from '@/api'

interface PhotoUploadProps {
  itemId?: string
  value?: string[]
  onChange?: (urls: string[]) => void
  onFilesSelect?: (files: File[]) => void
  maxCount?: number
  disabled?: boolean
}

const PhotoUpload = ({ itemId, value = [], onChange, onFilesSelect, maxCount = 3, disabled = false }: PhotoUploadProps) => {
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [fileList, setFileList] = useState<UploadFile[]>([])

  useEffect(() => {
    if (value) {
      const files: UploadFile[] = value.map((url, index) => ({
        uid: `-${index}`,
        name: `photo-${index}`,
        status: 'done',
        url,
      }))
      setFileList(files)
    }
  }, [value])

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList)
    const urls = newFileList.filter((f) => f.status === 'done').map((f) => f.url || f.response?.url)
    onChange?.(urls)

    const pendingFiles = newFileList
      .filter((f) => f.status === 'uploading' || f.status === 'done')
      .map((f) => f.originFileObj as File)
      .filter(Boolean)
    onFilesSelect?.(pendingFiles)
  }

  const handleUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      if (!itemId) {
        if (onFilesSelect) {
          onSuccess?.({}, file as File)
        } else {
          message.error('请先保存物品后再上传照片')
          onError?.(new Error('物品ID不存在'))
        }
        return
      }
      const result = await uploadItemPhotos(itemId, [file as File])
      onSuccess?.({ url: result.urls[0] }, file as File)
      message.success('上传成功')
    } catch (error) {
      console.error('Upload failed:', error)
      onError?.(error as Error)
    }
  }

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File)
    }
    setPreviewImage(file.url || (file.preview as string))
    setPreviewVisible(true)
  }

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter((f) => f.uid !== file.uid)
    setFileList(newFileList)
    const urls = newFileList.filter((f) => f.status === 'done').map((f) => f.url || f.response?.url)
    onChange?.(urls)
  }

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传</div>
    </div>
  )

  return (
    <>
      <Upload
        listType="picture-card"
        fileList={fileList}
        customRequest={handleUpload}
        onChange={handleChange}
        onPreview={handlePreview}
        onRemove={handleRemove}
        beforeUpload={(file) => {
          const isImage = file.type.startsWith('image/')
          if (!isImage) {
            message.error('只能上传图片文件!')
            return Upload.LIST_IGNORE
          }
          const isLt5M = file.size / 1024 / 1024 < 5
          if (!isLt5M) {
            message.error('图片大小不能超过 5MB!')
            return Upload.LIST_IGNORE
          }
          return true
        }}
        maxCount={maxCount}
        disabled={disabled}
        itemRender={(_originNode, file) => (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {file.url && <Image src={file.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} preview={false} />}
            {!file.url && file.preview && <img src={file.preview as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'space-around',
                padding: '4px 0',
                opacity: 0,
                transition: 'opacity 0.3s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
              className="upload-actions"
            >
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  handlePreview(file)
                }}
                style={{ color: 'white', cursor: 'pointer' }}
              >
                预览
              </span>
              {!disabled && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(file)
                  }}
                  style={{ color: 'white', cursor: 'pointer' }}
                >
                  <DeleteOutlined />
                </span>
              )}
            </div>
          </div>
        )}
      >
        {fileList.length >= maxCount || disabled ? null : uploadButton}
      </Upload>
      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
      <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
        最多上传 {maxCount} 张图片，单张不超过 5MB
      </p>
    </>
  )
}

export default PhotoUpload
