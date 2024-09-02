import mongoose from 'mongoose';

const PdfSchema = new mongoose.Schema({
  userId : {
    type : String,
    require :true
  },
  pdfName : {
    type : String,
    require : true
  },
  pdfUrl : {
    type : String,
    require : true
  }
});

export default mongoose.models.Pdf || mongoose.model('Pdf', PdfSchema);