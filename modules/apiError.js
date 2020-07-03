
class ApiError {
  constructor(title,message) {
    this.title = title;
    this.message = message;
    this.getJsonError = this.getJsonError.bind(this);
  }

  getJsonError() {
    return {
      error: this.title,
      message: this.message,
    }
  }
}

module.exports = ApiError;