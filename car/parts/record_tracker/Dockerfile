FROM ryanzotti/generic_server:latest

# Fixed: ValueError: numpy.ufunc size changed, may indicate binary incompatibility. Expected 124 from C header, got 112 from PyObject
# https://github.com/scikit-learn-contrib/hdbscan/issues/272#issuecomment-453958532
RUN pip install numpy==1.16.0

COPY ./ /root/
